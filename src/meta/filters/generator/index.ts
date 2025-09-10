/* eslint-disable no-eval */
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as prettier from 'prettier';
import {
  Block,
  ClassDeclaration,
  MethodDeclaration,
  Node,
  Project,
  SourceFile,
} from 'ts-morph';

const TYPE_MAP_START_COMMENT = '/// region: type-map-start';
const TYPE_MAP_END_COMMENT = '/// region: type-map-end';

async function getFilterTreeTypeMap(): Promise<string> {
  const file = path.join(__dirname, '../tree.ts');
  const content = await fs.promises.readFile(file, 'utf-8');
  const start = content.indexOf(TYPE_MAP_START_COMMENT);
  const end = content.indexOf(TYPE_MAP_END_COMMENT);
  if (start === -1 || end === -1) {
    throw new Error('Type map not found');
  }

  return content.substring(start, end + TYPE_MAP_END_COMMENT.length);
}

async function discoverFilterFilePaths(dir: string): Promise<string[]> {
  const dirContents = await fs.promises.readdir(dir);
  const output: string[] = [];

  for (const item of dirContents) {
    const itemPath = path.join(dir, item);
    const stat = await fs.promises.stat(itemPath);

    if (stat.isDirectory()) {
      if (item === 'node_modules') {
        continue;
      }

      output.push(...(await discoverFilterFilePaths(itemPath)));
    } else if (item.endsWith('.controller.ts')) {
      output.push(itemPath);
    }
  }

  return output;
}

async function resolveFilterSourceFiles(
  project: Project,
): Promise<SourceFile[]> {
  const filterFilePaths = await discoverFilterFilePaths(process.cwd());
  const filterFiles: SourceFile[] = [];

  for (const file of filterFilePaths) {
    const sourceFile = project.addSourceFileAtPath(file);
    const classes = sourceFile.getClasses();
    const methods = classes.flatMap((x) => x.getMethods());
    const hasFilterDecorator = methods.some((x) =>
      x.getDecorator('Filterable'),
    );

    if (hasFilterDecorator) {
      filterFiles.push(sourceFile);
      continue;
    }

    sourceFile.delete();
  }
  project.resolveSourceFileDependencies();

  return filterFiles;
}

interface CodegentOutputFilterAPIUsage {
  filterType: string;
  filterName: string;
  filterConfiguration?: Record<string, unknown>;
}

interface CodegenOutputFilter {
  filterName: string;
  methodName: string;
  methodDeclaration: MethodDeclaration;
  usage: CodegentOutputFilterAPIUsage[];
}

interface CodegenOutput {
  classDeclaration: ClassDeclaration;
  filters: CodegenOutputFilter[];
}

function extractBodyFiltersAPIUsage(
  body: Block,
): CodegentOutputFilterAPIUsage[] {
  const output: CodegentOutputFilterAPIUsage[] = [];

  body.forEachDescendant((node) => {
    if (!Node.isCallExpression(node)) return;

    const expression = node.getExpression();
    if (!Node.isPropertyAccessExpression(expression)) return;

    const expressionBase = expression.getExpression();
    if (!Node.isIdentifier(expressionBase)) return;
    if (expressionBase.getText() !== '$filters') return;

    const filterType = expression.getName();
    const args = node.getArguments();

    const filterNameArg = args[0];
    assert(filterNameArg !== undefined, 'Filter name argument not found');
    assert(
      Node.isStringLiteral(filterNameArg),
      'Filter name argument is not a string literal',
    );
    const filterName = filterNameArg.getLiteralValue();

    const filterConfigurationArg = args[1];
    const filterConfiguration = filterConfigurationArg
      ? eval(`(${filterConfigurationArg.getText()})`)
      : undefined;

    if (
      output.find(
        (x) => x.filterName === filterName && x.filterType === filterType,
      )
    ) {
      return;
    }

    output.push({
      filterType,
      filterName,
      filterConfiguration,
    });
  });

  return output;
}

async function generateForClass(
  classDecl: ClassDeclaration,
): Promise<CodegenOutput> {
  const output: CodegenOutput = {
    classDeclaration: classDecl,
    filters: [],
  };

  const methodDecls = classDecl.getMethods();
  for (const methodDecl of methodDecls) {
    const filterableDecorator = methodDecl.getDecorator('Filterable');
    if (!filterableDecorator) continue;

    console.log(
      `Discovered method ${classDecl.getName()}::${methodDecl.getName()}`,
    );

    const filterableNameNode = filterableDecorator.getArguments()[0];
    assert(
      filterableNameNode !== undefined,
      'Filterable name argument not found',
    );
    assert(
      Node.isStringLiteral(filterableNameNode),
      'Filterable name argument is not a string literal',
    );
    const filterName = filterableNameNode.getLiteralValue();

    const methodBody = methodDecl.getBodyOrThrow();
    assert(methodBody instanceof Block, 'Method body is not a block');
    const filterAPIUsage = extractBodyFiltersAPIUsage(methodBody);

    const filter: CodegenOutputFilter = {
      filterName,
      methodName: methodDecl.getName(),
      methodDeclaration: methodDecl,
      usage: filterAPIUsage,
    };

    output.filters.push(filter);
  }

  return output;
}

async function generate(file: SourceFile): Promise<CodegenOutput[]> {
  return await Promise.all(
    file
      .getClasses()
      .filter(
        (x) =>
          x.getDecorator('Controller') !== undefined &&
          x
            .getMethods()
            .find((x) => x.getDecorator('Filterable') !== undefined),
      )
      .map(generateForClass),
  );
}

function renderFilter(filter: CodegenOutputFilter): string {
  const usage = filter.usage
    .map((usage) =>
      `
'${usage.filterName}': ${JSON.stringify(
        usage.filterConfiguration
          ? {
              type: usage.filterType,
              ...usage.filterConfiguration,
            }
          : {
              type: usage.filterType,
            },
      )},
`.trim(),
    )
    .join('\n');

  return `
  '${filter.filterName}': {
    name: '${filter.filterName}',
    properties: {
      ${usage}
    }
  },
`.trim();
}

async function render(outputs: CodegenOutput[]): Promise<string> {
  const filterTreeTypeMap = await getFilterTreeTypeMap();

  const filters = outputs.flatMap((output) => output.filters);

  return (
    `
// Autogenerated by the filter generator
// Do not modify this file manually
// ${new Date().toISOString()}

${filterTreeTypeMap}

export type FilterDefinition = {
  name: string;
  properties: Record<string, FilterConfiguration>;
}

export const filters = {
${filters.map(renderFilter).join('\n')}
} as const satisfies Record<string, FilterDefinition>;

export type FilterNames = keyof typeof filters;

export function filter<T extends FilterNames>(name: T): typeof filters[T] {
  return filters[name];
}

`.trim() + '\n'
  );
}

async function prettify(code: string): Promise<string> {
  const config = await fs.promises.readFile(
    path.join(process.cwd(), '.prettierrc'),
    'utf-8',
  );
  return await prettier.format(code, {
    parser: 'typescript',
    ...JSON.parse(config),
  });
}

export async function main(): Promise<void> {
  const project = new Project({
    skipAddingFilesFromTsConfig: true,
    tsConfigFilePath: path.join(process.cwd(), 'tsconfig.json'),
  });

  const filterFiles = await resolveFilterSourceFiles(project);
  const outputs = (await Promise.all(filterFiles.map(generate))).flat();

  const allFilters = outputs.flatMap((x) => x.filters);
  console.log(`Discovered ${allFilters.length} filters`);

  for (const filter of allFilters) {
    const duplicates = allFilters.filter(
      (x) => x.filterName === filter.filterName,
    );

    if (duplicates.length > 1) {
      throw new Error(
        `Duplicate filter name ${filter.filterName} found in: \n ${duplicates
          .map((x) => `\t${x.methodDeclaration.getSourceFile().getFilePath()}:${x.methodDeclaration.getStartLineNumber()}`)
          .join('\n')}`,
      );
    };
  }

  const rendered = await render(outputs);
  const code = await prettify(rendered);

  const outputDir = path.join(__dirname, '../../generated');
  await fs.promises.mkdir(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, 'filters.ts');
  await fs.promises.writeFile(outputPath, code);
}

main();

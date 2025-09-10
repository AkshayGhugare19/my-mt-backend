import { resolve } from 'path';
import { loadEnv } from 'vite';
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';
import { readFileSync } from 'fs';

const tsconfig = JSON.parse(readFileSync('./tsconfig.json', 'utf8'));

export default defineConfig({
  test: {
    include: ['**/*.e2e-spec.ts'],
    globals: true,
    root: './',
    env: loadEnv('test', process.cwd(), ''),
  },
  plugins: [swc.vite({
    module: { type: 'es6' },
  })],
  resolve: {
    alias: {
      ...Object.entries(tsconfig.compilerOptions.paths).reduce((acc, [key, value]) => {
        const alias = key.split('/').at(0);
        if (alias) {
          const parsedValue = (value as string[]).at(0)?.replace('/*', '');
          if (parsedValue) {
            acc[alias] = resolve(__dirname, parsedValue);
          }
        }
        return acc;
      }, {} as Record<string, string>),
    },
    conditions: ['import', 'node', 'default'],
  },
});

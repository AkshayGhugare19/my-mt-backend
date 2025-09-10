import { resolve } from 'path';
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

const tsconfig = require('./tsconfig.json');

export default defineConfig({
  test: {
    include: ['**/*.spec.ts'],
    globals: true,
    root: './',
  },
  plugins: [
    // This is required to build the test files with SWC
    swc.vite({
      // Explicitly set the module type to avoid inheriting this value from a `.swcrc` config file
      module: { type: 'es6' },
    }),
  ],
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

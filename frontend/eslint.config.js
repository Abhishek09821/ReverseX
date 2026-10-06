import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'src/types/api.generated.ts'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Payloads from the API and IndexedDB are validated with zod at the boundary; `any`
      // anywhere else means a type was given up on rather than modelled.
      '@typescript-eslint/no-explicit-any': 'error',
      // The old `Finding.confidence` restriction has been removed — confidence is now a
      // first-class output field on ScanRecord and ReconstructionPrompt in the new system.
      'no-restricted-syntax': 'off',
    },
  },
  {
    // Tests and report renderers legitimately read the whole payload shape.
    files: ['src/**/*.test.{ts,tsx}', 'src/test/**/*.ts'],
    rules: { '@typescript-eslint/no-explicit-any': 'off', 'no-restricted-syntax': 'off' },
  },
  {
    // shadcn/ui components are copied in and follow the upstream convention of exporting a
    // component alongside its `cva` variants. Keeping them unmodified is the point of that model,
    // so the fast-refresh warning is not actionable here.
    files: ['src/components/ui/**/*.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
);

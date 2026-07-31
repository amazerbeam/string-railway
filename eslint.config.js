import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import eslintConfigPrettier from 'eslint-config-prettier'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ['src/rules/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'react/*', 'react-dom/*'],
              message:
                'src/rules/ is pure TypeScript — no React. See README, "The src/rules/ boundary".',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'src/rules/ must not touch the DOM.' },
        { name: 'document', message: 'src/rules/ must not touch the DOM.' },
        { name: 'navigator', message: 'src/rules/ must not touch the DOM.' },
        { name: 'localStorage', message: 'src/rules/ must not touch browser storage.' },
        { name: 'sessionStorage', message: 'src/rules/ must not touch browser storage.' },
        { name: 'fetch', message: 'src/rules/ must not touch the network or the DOM.' },
        { name: 'location', message: 'src/rules/ must not touch the DOM.' },
        { name: 'history', message: 'src/rules/ must not touch the DOM.' },
        { name: 'XMLHttpRequest', message: 'src/rules/ must not touch the network or the DOM.' },
        {
          name: 'requestAnimationFrame',
          message: 'src/rules/ must not touch the DOM.',
        },
        {
          name: 'cancelAnimationFrame',
          message: 'src/rules/ must not touch the DOM.',
        },
        { name: 'alert', message: 'src/rules/ must not touch the DOM.' },
        { name: 'confirm', message: 'src/rules/ must not touch the DOM.' },
        { name: 'matchMedia', message: 'src/rules/ must not touch the DOM.' },
        { name: 'getComputedStyle', message: 'src/rules/ must not touch the DOM.' },
        { name: 'Image', message: 'src/rules/ must not touch the DOM.' },
        { name: 'Worker', message: 'src/rules/ must not touch the DOM.' },
      ],
    },
  },
  eslintConfigPrettier,
])

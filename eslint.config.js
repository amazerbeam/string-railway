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
    files: ['src/warCouncil/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'react/*', 'react-dom/*'],
              message: 'src/warCouncil/ is pure TypeScript — no React.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'This module must not touch the DOM.' },
        { name: 'document', message: 'This module must not touch the DOM.' },
        { name: 'navigator', message: 'This module must not touch the DOM.' },
        { name: 'localStorage', message: 'This module must not touch browser storage.' },
        { name: 'sessionStorage', message: 'This module must not touch browser storage.' },
        { name: 'fetch', message: 'This module must not touch the network or the DOM.' },
        { name: 'location', message: 'This module must not touch the DOM.' },
        { name: 'history', message: 'This module must not touch the DOM.' },
        { name: 'XMLHttpRequest', message: 'This module must not touch the network or the DOM.' },
        { name: 'requestAnimationFrame', message: 'This module must not touch the DOM.' },
        { name: 'cancelAnimationFrame', message: 'This module must not touch the DOM.' },
        { name: 'alert', message: 'This module must not touch the DOM.' },
        { name: 'confirm', message: 'This module must not touch the DOM.' },
        { name: 'matchMedia', message: 'This module must not touch the DOM.' },
        { name: 'getComputedStyle', message: 'This module must not touch the DOM.' },
        { name: 'Image', message: 'This module must not touch the DOM.' },
        { name: 'Worker', message: 'This module must not touch the DOM.' },
      ],
    },
  },
  eslintConfigPrettier,
])

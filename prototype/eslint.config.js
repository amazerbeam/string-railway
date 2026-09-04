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
    files: [
      'src/warCouncil/**/*.{ts,tsx}',
      'src/hunt/**/*.{ts,tsx}',
      'src/vault/**/*.{ts,tsx}',
      // DLR-130 — the headless simulator is pure TypeScript: it drives the engine and the felt's
      // reducer with no React and no DOM, and it must stay that way to keep running under node.
      'src/sim/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'react/*', 'react-dom/*'],
              message: 'This module is pure TypeScript — no React.',
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
  {
    // Flat config replaces (never merges) same-key rule options when two config
    // objects match the same file. src/warCouncil/** and src/hunt/** already carry
    // their own, fuller no-restricted-globals override above (which also bans
    // localStorage/sessionStorage). They must stay ignored here, or this block's
    // narrower options would silently overwrite that override's DOM bans.
    // src/vault/** joins the same list for the same flat-config replacement reason —
    // the pure-core block above already bans localStorage and sessionStorage there,
    // so nothing is lost. src/sim/** joins for the identical reason (DLR-130).
    files: ['src/**/*.{ts,tsx}'],
    ignores: [
      'src/persistence/browserStorage.ts',
      'src/warCouncil/**',
      'src/hunt/**',
      'src/vault/**',
      // DLR-130 — flat config REPLACES, never merges, same-key rule options. Without this entry
      // the narrower storage-only `no-restricted-globals` list below would silently overwrite the
      // pure-core block's full DOM ban for `src/sim/**`, and `npm run lint` would still exit 0.
      // That regression was shipped once already, on DLR-106.
      'src/sim/**',
    ],
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: 'localStorage',
          message: 'Go through src/persistence — see .claude/rules/save-data-versioning.md.',
        },
        {
          name: 'sessionStorage',
          message: 'Go through src/persistence — see .claude/rules/save-data-versioning.md.',
        },
      ],
    },
  },
  eslintConfigPrettier,
])

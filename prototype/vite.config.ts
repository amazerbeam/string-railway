import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // A relative base keeps asset URLs correct whether this is served from a domain
  // root or a sub-path. Safe while this is a single view with no router — switch to
  // an explicit path before adding the first client-side route.
  base: './',
  plugins: [react()],
  server: {
    // dist/dist-ssr are build output, not source — watching them risks a locked or
    // mid-write file there (seen from dist-ssr) crashing the dev server's fs watcher.
    watch: { ignored: ['**/dist/**', '**/dist-ssr/**'] },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['src/**/__tests__/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          include: ['src/**/__tests__/**/*.test.tsx'],
        },
      },
    ],
  },
})

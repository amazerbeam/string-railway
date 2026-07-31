import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves this from /string-railway/, not a domain root, so asset URLs
  // must be relative. Safe while this is a single view with no router — revisit before
  // adding client-side routes.
  base: './',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
  },
})

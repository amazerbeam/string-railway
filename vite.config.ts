import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // A relative base keeps asset URLs correct whether this is served from a domain
  // root or a sub-path. Safe while this is a single view with no router — switch to
  // an explicit path before adding the first client-side route.
  base: './',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
  },
})

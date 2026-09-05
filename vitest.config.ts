import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    globals: false,
    // Playwright owns e2e/*.spec.ts; Vitest only takes co-located unit tests.
    include: ['src/**/*.test.ts'],
  },
})

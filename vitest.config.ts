import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // tsconfig sets `jsx: preserve` for Next, so the runner has to compile JSX
  // itself — the email templates it imports are .tsx.
  plugins: [react()],
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

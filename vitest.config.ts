import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), '.'),
    },
  },
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 20000,
    hookTimeout: 60000,
    restoreMocks: true,
    sequence: {
      // Los tests de servidor (spawn de `tsx server.ts`) se ejecutan al final
      // para no interferir con los unitarios que usan timers/sockets simulados.
      hooks: 'list',
    },
  },
});

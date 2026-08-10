import path from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**', 'apps/**', 'output/**', '.claude/**'],
    coverage: {
      provider: 'v8',
      // REGRESSION FLOOR — not a target.
      //
      // Each number sits a few points below what the suite actually covers today
      // (2026-08-11: statements 52.42, branches 42.64, functions 41.51, lines 54.05).
      // The gate exists to stop coverage sliding, not to demand a level we have not
      // reached. The 80% figure in the global rules is an aspiration tracked
      // separately — wiring it in here would just break CI on every run.
      //
      // Raise these when coverage genuinely improves. Never lower them to make a
      // red build pass; that turns the floor into a rubber stamp.
      thresholds: {
        statements: 50,
        branches: 40,
        functions: 39,
        lines: 51,
      },
      reporter: ['text-summary', 'json-summary', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/__tests__/**',
        'src/test/**',
        'src/**/*.d.ts',
        // Data-only modules: tariff tables, zone maps, i18n dictionaries. These are
        // constants, so "coverage" here measures whether a test happened to import
        // the file, not whether anything is verified.
        'src/config/*_tariff.ts',
        'src/config/*_zones.ts',
        'src/i18n/**',
        'src/pages/guide/locales/**',
      ],
    },
  },
});

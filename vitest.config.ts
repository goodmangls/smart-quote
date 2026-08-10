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
      // Reporting only. No `thresholds` is set yet — a floor will be added once a
      // baseline is agreed. Setting one now would fail CI immediately, and a
      // target ("get to 80%") is not the same thing as a regression floor
      // ("never drop below today"); conflating them makes the gate behave backwards.
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

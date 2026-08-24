module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'apps/', 'output/'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    '@typescript-eslint/no-explicit-any': 'warn',

    // Off deliberately, not as debt. Focusing the first field is the intended
    // behaviour on surfaces whose whole purpose is that one form (login, and
    // the save-quote note box that opens on demand). The rule guards against
    // yanking focus on a general-purpose page, which is not what these do.
    'jsx-a11y/no-autofocus': 'off',
  },
  overrides: [
    {
      // Modal backdrops: a click-to-dismiss overlay is a convenience for mouse
      // users, and all three dialogs already close on Escape. The fix the rule
      // asks for — key handlers on the backdrop div — would put a non-control
      // in the tab order, which is worse than the pattern it replaces. Off for
      // these files rather than globally, so the rules still cover real
      // click-handling elements elsewhere.
      files: [
        'src/components/ui/ConfirmDialog.tsx',
        'src/features/dashboard/components/AccountSettingsModal.tsx',
        'src/features/history/components/QuoteDetailModal.tsx',
      ],
      rules: {
        'jsx-a11y/click-events-have-key-events': 'off',
        'jsx-a11y/no-static-element-interactions': 'off',
      },
    },
    {
      // ── A11Y DEBT RATCHET — this list only shrinks ──────────────────────
      //
      // Same idea as the coverage floor in vitest.config.ts: the gate exists to
      // stop new debt, not to pretend the old debt is fine. Every file below has
      // a label that is visually present but not associated with its control, so
      // a screen reader announces an unnamed field (WCAG 4.1.2).
      //
      // 18 findings across 6 files as of 2026-08-24. Two of the same shape were
      // fixed the week this list was written (RateTableViewer #88 via aria-label,
      // SurchargeForm #89 via useId + htmlFor), which is where the pattern to
      // copy lives.
      //
      // NEVER add a file here to make a red build pass. A new file that needs an
      // entry means the change should carry the label fix instead.
      files: [
        'src/features/admin/components/fsc/FscHistoryPanel.tsx',
        'src/features/admin/components/margin/MarginRuleForm.tsx',
        'src/features/quote/components/CargoSection.tsx',
        'src/features/quote/components/FinancialSection.tsx',
        'src/features/quote/components/ServiceSection.tsx',
        'src/features/quote/components/addon/AddOnPanelShell.tsx',
      ],
      rules: {
        'jsx-a11y/label-has-associated-control': 'off',
      },
    },
    {
      // Same ratchet, different rule: <nav role="tablist"> puts an interactive
      // role on a landmark. The fix is a plain element inside the nav, but it
      // moves the tab semantics the header relies on, so it wants its own change.
      files: ['src/components/layout/NavigationTabs.tsx'],
      rules: {
        'jsx-a11y/no-noninteractive-element-to-interactive-role': 'off',
      },
    },
  ],
}

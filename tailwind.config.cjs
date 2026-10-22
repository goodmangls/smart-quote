const { fontFamily } = require('tailwindcss/defaultTheme');
const colors = require('tailwindcss/colors');

//
// BridgeLogis by Goodman GLS — Tailwind config
// 디자인 토큰 SSOT: docs/02-design/DESIGN.md (v1.1.0, 2026-04-24)
//
// 토큰 레이어:
//   1. Brand    — BridgeLogis 브랜드 가이드 정본 (navy/deep-blue/brand-blue/cyan/gold)
//   2. Semantic — UI 의도 (success/warning/destructive/info)
//   3. Neutral  — gray (grayscale)
//
// Phase 2 완료 (2026-04-24): Legacy jways-*/accent-* 제거. Tailwind 기본 blue-*/sky-* 사용 금지.
//
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', ...fontFamily.sans],
      },
      // 진입 전용 모션 (DESIGN.md §10.3) — 펼친 패널·바뀐 캐러셀 페이지가 살짝 내려앉으며 나타난다.
      // 닫힘·퇴장에는 쓰지 않는다. 사용처는 반드시 motion-reduce:animate-none 을 함께 건다.
      keyframes: {
        'enter-fade': {
          from: { opacity: '0', transform: 'translateY(-4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'enter-fade': 'enter-fade 200ms ease-out both',
      },
      colors: {
        // ─── Neutral ───
        gray: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0a0a0a',
        },

        // ─── Brand (BridgeLogis 정본) ───
        navy: { DEFAULT: '#0A1628' },          // 배경 60%
        'deep-blue': { DEFAULT: '#152347' },   // 보조 20%
        'brand-blue': {                         // CTA 15% — #1D6FD1 기준 10단계
          DEFAULT: '#1D6FD1',
          50: '#eef5fd',
          100: '#d5e7fa',
          200: '#aacff4',
          300: '#7fb7ee',
          400: '#549fe8',
          500: '#1D6FD1',
          600: '#1759a7',
          700: '#11437d',
          800: '#0b2d54',
          900: '#06182a',
          950: '#030c15',
        },
        cyan: {                                 // 시그니처 — #00B4D8 기준
          DEFAULT: '#00B4D8',
          50: '#e6f9fd',
          100: '#ccf3fb',
          200: '#99e6f7',
          300: '#66daf3',
          400: '#33c7ed',
          500: '#00B4D8',
          600: '#0090ad',
          700: '#006c82',
          800: '#004857',
          900: '#00242b',
        },
        gold: {                                 // 강조 5% — #E8A838 기준
          DEFAULT: '#E8A838',
          50: '#fdf6e8',
          100: '#fbecd0',
          200: '#f7d9a1',
          300: '#f3c673',
          400: '#efb344',
          500: '#E8A838',
          600: '#ba862d',
          700: '#8b6522',
          800: '#5d4316',
          900: '#2e220b',
        },

        // ─── Semantic (UI 의도) ───
        success: colors.emerald,      // DEFAULT=emerald-500
        warning: colors.amber,        // DEFAULT=amber-500
        destructive: colors.red,      // DEFAULT=red-500
        info: {                        // brand-blue 와 정렬
          DEFAULT: '#1D6FD1',
          ...colors.blue,
          500: '#1D6FD1',
        },

      }
    },
  },
  plugins: [],
}

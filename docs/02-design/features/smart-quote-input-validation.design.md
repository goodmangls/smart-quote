---
feature: smart-quote-input-validation
date: 2026-05-15
phase: design
plan_ref: docs/01-plan/features/smart-quote-input-validation.plan.md
scope: Phase A — Frontend Zod 도입
revision: α
status: draft
---

# Design — smart-quote-input-validation Phase A (Frontend Zod)

## §0. 본 design 의 범위

전략 Y (분리 PR) 결정에 따라 **Phase A (Frontend Zod) 1차 PR** 의 구현 설계만 다룬다. Phase B (Backend `validate_quote_input!` 확장) 는 별 design 문서.

## §1. 파일 구조

```
src/
├── lib/
│   └── schemas/
│       ├── quoteInput.schema.ts       # cargoItemSchema + quoteInputSchema
│       ├── quoteListParams.schema.ts  # quoteListParamsSchema
│       ├── zodError.ts                # zodErrorToString helper
│       └── __tests__/
│           ├── quoteInput.schema.test.ts
│           └── quoteListParams.schema.test.ts
└── api/
    └── quoteApi.ts                    # parse() 적용 지점
```

## §2. Schema 매핑

### 2.1 cargoItemSchema (src/types.ts:17-24 → Zod)

```ts
import { z } from 'zod';

export const cargoItemSchema = z.object({
  id: z.string().min(1, 'id is required'),
  width: z.number().positive().max(1000, 'width must be < 1000cm'),
  length: z.number().positive().max(1000, 'length must be < 1000cm'),
  height: z.number().positive().max(1000, 'height must be < 1000cm'),
  weight: z.number().positive().max(10000, 'weight must be < 10000kg per box'),
  quantity: z.number().int().positive().max(10000),
});

export type CargoItem = z.infer<typeof cargoItemSchema>;
```

### 2.2 quoteInputSchema (src/types.ts:26-85 → Zod)

```ts
import { z } from 'zod';
import { cargoItemSchema } from './quoteInput.schema';

export const incotermSchema = z.enum(['DAP', 'DDP', 'EXW', 'FOB', 'CIF', 'CIP']);
export const packingTypeSchema = z.enum(['Carton Box', 'Wood Crate', 'Pallet', 'Cargo Bag']);
export const shippingModeSchema = z.enum(['Door-to-Door', 'Door-to-Airport']);
export const carrierSchema = z.enum(['UPS', 'DHL']);

export const quoteInputSchema = z.object({
  // Required
  originCountry: z.string().length(2, 'ISO 2-letter country code'),
  destinationCountry: z.string().length(2),
  destinationZip: z.string().max(20).optional().default(''),
  incoterm: incotermSchema,
  packingType: packingTypeSchema,
  items: z.array(cargoItemSchema).min(1, 'at least 1 item required').max(100),
  marginPercent: z.number().min(0).max(100),
  dutyTaxEstimate: z.number().min(0).max(1e9).default(0),

  // Market Variables
  exchangeRate: z.number().positive().max(10000, 'KRW/USD < 10000'),
  fscPercent: z.number().min(0).max(200),

  // Optional
  shippingMode: shippingModeSchema.optional(),
  overseasCarrier: carrierSchema.optional(),
  manualPackingCost: z.number().min(0).max(1e9).optional(),
  manualSurgeCost: z.number().min(0).max(1e9).optional(),
  pickupInSeoulCost: z.number().min(0).max(1e9).optional(),
  validityDays: z.number().int().min(1).max(365).optional(),

  // Add-ons (자유 string array — 공백/길이 제한)
  dhlAddOns: z.array(z.string().min(1).max(20)).max(30).optional(),
  upsAddOns: z.array(z.string().min(1).max(20)).max(30).optional(),
  dhlDeclaredValue: z.number().min(0).max(1e10).optional(),

  // Resolved (백엔드 응답 echo — 검증 느슨)
  resolvedSurcharges: z
    .array(
      z.object({
        code: z.string().min(1).max(50),
        name: z.string().max(200),
        nameKo: z.string().max(200).nullable(),
        chargeType: z.enum(['fixed', 'rate']),
        amount: z.number().min(0).max(1e10),
        sourceUrl: z.string().max(500).nullable(),
      }),
    )
    .max(50)
    .optional(),

  resolvedAddonRates: z
    .array(
      z.object({
        code: z.string().min(1).max(50),
        carrier: carrierSchema,
        nameEn: z.string().max(200),
        nameKo: z.string().max(200),
        chargeType: z.enum(['fixed', 'per_piece', 'per_carton', 'calculated']),
        unit: z.enum(['shipment', 'piece', 'carton']),
        amount: z.number().min(0).max(1e10),
        perKgRate: z.number().min(0).max(1e10).nullable(),
        ratePercent: z.number().min(0).max(1e6).nullable(),
        minAmount: z.number().min(0).max(1e10).nullable(),
        fscApplicable: z.boolean(),
        autoDetect: z.boolean(),
        selectable: z.boolean(),
        condition: z.string().max(500).nullable(),
        detectRules: z.record(z.union([z.number(), z.array(z.string())])).nullable(),
      }),
    )
    .max(100)
    .optional(),
});

export type QuoteInput = z.infer<typeof quoteInputSchema>;
```

### 2.3 quoteListParamsSchema (src/types.ts:232-243 → Zod)

```ts
export const quoteStatusSchema = z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired']);
export const amountCurrencySchema = z.enum(['KRW', 'USD']);

export const quoteListParamsSchema = z.object({
  page: z.number().int().min(1).max(10000).optional(),
  perPage: z.number().int().min(1).max(100).optional(),
  q: z.string().max(200).optional(),
  destinationCountry: z.string().length(2).optional(),
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD')
    .optional(),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD')
    .optional(),
  status: quoteStatusSchema.optional(),
  minAmount: z.number().min(0).max(1e12).optional(),
  maxAmount: z.number().min(0).max(1e12).optional(),
  amountCurrency: amountCurrencySchema.optional(),
});

export type QuoteListParams = z.infer<typeof quoteListParamsSchema>;
```

## §3. Error Handling

### 3.1 zodErrorToString helper

```ts
// src/lib/schemas/zodError.ts
import { ZodError } from 'zod';

export function zodErrorToString(err: ZodError): string {
  return err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
}
```

### 3.2 API 적용 패턴 (parse vs safeParse)

`src/api/quoteApi.ts` 의 calculateQuote / saveQuote / listQuotes 함수:

```ts
import { quoteInputSchema } from '@/lib/schemas/quoteInput.schema';
import { zodErrorToString } from '@/lib/schemas/zodError';
import * as Sentry from '@sentry/browser';

export async function saveQuote(input: QuoteInput): Promise<...> {
  const parsed = quoteInputSchema.safeParse(input);
  if (!parsed.success) {
    const msg = zodErrorToString(parsed.error);
    Sentry.captureMessage(`Invalid QuoteInput: ${msg}`, 'warning');
    throw new Error(`입력 검증 실패: ${msg}`);
  }
  // ... 기존 로직 (parsed.data 사용)
}
```

**safeParse 사용 이유**: throw 대신 result tuple — 호출처에서 사용자 친화적 메시지 조립 + Sentry 로깅 일관.

## §4. Type Migration 전략 (점진 vs 즉시)

### 옵션 점진 (recommended)

1. Phase A 1차 PR: schema 추가 + API parse() 만 (기존 type 유지)
2. Phase A 2차 (별 commit): `src/types.ts` 의 interface → `z.infer<>` 로 치환

**이유**: 단일 commit 으로 schema + type migration 동시 시 회귀 위험 큼 (40+ 사용처). 1차에서 schema/API 만 검증 후 2차에서 type 통합.

### 본 PR scope (Phase A 1차)

- ✅ A1: Zod 설치
- ✅ A2: schema 파일 3개 생성
- ✅ A3: quoteApi.ts 4 곳 (calculateQuote, saveQuote, listQuotes, exportQuotesCsv 등) parse 적용
- ✅ A4: zodError helper
- ✅ A5: 단위 테스트
- ⏭️ A6 (별 commit): type 단일 진실 — 1차 머지 후

## §5. 검증 케이스 (테스트)

### 5.1 quoteInput.schema.test.ts (예상 30+ cases)

| 카테고리            | 케이스                                              |
| ------------------- | --------------------------------------------------- |
| 정상                | 표준 input (UPS, DHL, items 1개/다개)               |
| 경계                | weight=0.001, marginPercent=0/100, fscPercent=0/200 |
| 실패 — required     | destinationCountry 누락, items 빈 배열              |
| 실패 — enum         | incoterm='INVALID', packingType='INVALID'           |
| 실패 — range        | weight=-1, exchangeRate=20000, items.length=2000    |
| 실패 — type         | weight='abc', items=null                            |
| 실패 — array bounds | items 101개, dhlAddOns 31개                         |

### 5.2 quoteListParams.schema.test.ts (15+ cases)

- 정상: 모든 optional 빈, 모든 채움
- date format: '2026-05-15' OK, '2026/5/15' fail
- min/max amount: minAmount > maxAmount 시 추가 .refine() 가능 (스코프 외, 별 사이클)

## §6. 회귀 방지

| 항목               | 검증                             |
| ------------------ | -------------------------------- |
| 기존 1366 vitest   | ALL PASS 유지                    |
| `npx tsc --noEmit` | 0 errors                         |
| `npm run lint`     | 0 warnings (max-warnings 0)      |
| `npm run build`    | 정상, 번들 크기 +13 kB gzip 이내 |
| 실제 API 호출      | 로컬 dev 정상 saveQuote 동작     |

## §7. PR 메타데이터

- **Branch**: `feature/input-validation-frontend-zod`
- **PR title**: `feat(validation): Frontend Zod schema 도입 — QuoteInput + QuoteListParams 런타임 검증 (P0 #1 Phase A)`
- **scope**: A1-A5 (A6 type migration 은 별 commit, 머지 후)
- **회귀 priority**: lint/tsc/test/build 4단 검증 + 실제 API 호출 1회

## §8. 의존성 / 리스크

- **Zod ^3.x** (devDependencies 가 아닌 **dependencies** — runtime parse 필요)
- **번들 크기 ~13 kB gzip 증가** — PR #15 청크 최적화 후 측정. 현재 index.js 25.12 kB → 약 38 kB 예상 (수용 가능)
- **resolvedSurcharges/resolvedAddonRates** 는 백엔드 응답 echo 라 검증 느슨 적용 (length/type 만). strict 검증 시 백엔드 schema 변경 시 회귀 위험.

## §9. 다음 단계

본 design 검토 후 `/pdca do smart-quote-input-validation` 으로 구현 시작.

## §10. 관련 자료

- Plan: `docs/01-plan/features/smart-quote-input-validation.plan.md`
- 코드 참조:
  - `src/types.ts:17-24` CargoItem
  - `src/types.ts:26-85` QuoteInput
  - `src/types.ts:232-243` QuoteListParams
  - `src/api/quoteApi.ts` calculateQuote/saveQuote/listQuotes
- Zod 공식: https://zod.dev/
- 메모리: `project_smart_quote_code_analysis_2026_05_15_candidates.md`

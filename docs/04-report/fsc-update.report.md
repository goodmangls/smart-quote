# FSC 기본값 버그 수정 완료 보고서

**Feature**: fsc-update  
**Report Date**: 2026-04-13  
**Cycle Type**: Hotfix (PDCA Plan/Design 단계 생략 — 긴급 버그 수정)  
**Match Rate**: 100% (8/8 gap-detector 검증)  
**Result**: ✅ 성공

---

## 1. 배경 및 문제 정의

### 발견 경위

KS Ways 운영팀이 견적 가격 검증 중 결과값이 예상 원가 대비 현저히 낮음을 확인:

| 캐리어 | 실제 결과 | 예상 결과 | 오차 |
|--------|-----------|-----------|------|
| DHL    | 원가 × 66.555% | 원가 × 100% | **-33.4%** |
| UPS    | 원가 × 76.05%  | 원가 × 100% | **-24.0%** |
| FedEx  | 원가 × 74.59%  | 원가 × 100% | **-25.4%** |

### 근본 원인 (Root Cause)

두 오케스트레이터(`calculationService.ts`, `quote_calculator.rb`) 모두에서 FSC(Fuel Surcharge) 기본값이 `0%`로 처리되는 버그:

```typescript
// [BEFORE - BUG] 프론트엔드
const fscRate = (input.fscPercent || 0) / 100;  // fscPercent 없으면 0%
```

```ruby
# [BEFORE - BUG] 백엔드
fsc_rate = ((@input[:fscPercent] || 0) / 100.0)  # fscPercent 없으면 0%
```

**캐리어별 정상 기본값**: UPS = 48.5%, DHL = 46.0%  
→ FSC가 0%가 되면 최종 견적가에서 약 23~34%가 누락되는 구조적 오류 발생.

---

## 2. 분석 과정

### 2-1. 운임표(Tariff) 검증

`smart-quote-api/storage/tariffs/` 내 DHL, UPS 공식 PDF 및 변환 txt 파일을 분석:
- UPS, DHL 요율표 자체는 정확하게 반영됨 ✅
- FedEx는 별도 운임표 없이 미지원 상태 (범위 외)

### 2-2. 계산 파이프라인 추적

```
Base Rate  →  ×(1 + margin%)  →  ×(1 + fsc%)  →  + Add-ons  →  Final Quote
```

FSC가 0%일 때 `base × 48.5%` 해당 금액이 완전히 누락 → 체계적 과소 견적.

### 2-3. 추가 발견 (DHL FSC 오배정)

백엔드 `calculate_overseas`에서 DHL 경로에도 UPS 기본값(`DEFAULT_FSC_PERCENT = 48.5%`)이 넘어가던 버그 동시 발견 및 수정.

---

## 3. 수정 내용

### 3-1. 프론트엔드 (`src/features/quote/services/calculationService.ts`)

**Fix 1 — import 누락 추가** (lines 8-16):
```typescript
import {
  FUMIGATION_FEE,
  DEFAULT_EXCHANGE_RATE,
  DEFAULT_FSC_PERCENT,        // 추가
  DEFAULT_FSC_PERCENT_DHL,    // 추가
  PACKING_MATERIAL_BASE_COST,
  PACKING_LABOR_UNIT_COST,
  WAR_RISK_SURCHARGE_RATE,
  TRANSIT_TIMES,
} from '@/config/rates';
```

**Fix 2 — 캐리어별 기본값 적용** (lines ~307-308):
```typescript
// [BEFORE] const fscRate = (input.fscPercent || 0) / 100;
const defaultFsc = carrier === 'DHL' ? DEFAULT_FSC_PERCENT_DHL : DEFAULT_FSC_PERCENT;
const fscRate = (input.fscPercent || defaultFsc) / 100;
```

### 3-2. 백엔드 (`smart-quote-api/app/services/quote_calculator.rb`)

**Fix 1 — DHL calculate_overseas 경로** (calculate_overseas 메서드):
```ruby
when 'DHL'
  Calculators::DhlCost.call(
    billable_weight: @billable_weight,
    country: @input[:destinationCountry],
    fsc_percent: @input[:fscPercent] || DEFAULT_FSC_PERCENT_DHL  # DHL 전용 기본값
  )
```

**Fix 2 — calculate_totals FSC 계산** (calculate_totals 메서드):
```ruby
# [BEFORE] fsc_rate = ((@input[:fscPercent] || 0) / 100.0)
default_fsc = @carrier == 'DHL' ? DEFAULT_FSC_PERCENT_DHL : DEFAULT_FSC_PERCENT
fsc_rate = ((@input[:fscPercent] || default_fsc) / 100.0)
```

### 3-3. 상수 확인 (변경 없음)

| 파일 | 상수 | 값 |
|------|------|----|
| `src/config/rates.ts` | `DEFAULT_FSC_PERCENT` | 48.50 (UPS) |
| `src/config/rates.ts` | `DEFAULT_FSC_PERCENT_DHL` | 46.00 (DHL) |
| `lib/constants/rates.rb` | `DEFAULT_FSC_PERCENT` | 48.50 (UPS) |
| `lib/constants/rates.rb` | `DEFAULT_FSC_PERCENT_DHL` | 46.00 (DHL) |

---

## 4. 검증

### 4-1. TypeScript 타입 검사
```
npx tsc --noEmit → EXIT:0 (0 errors)
```

### 4-2. Gap Detector (bkit gap-detector)
```
Match Rate: 100% (8/8 items)
Hard Gaps:  0건
Deviations: 0건
```

검증 항목:
- ✅ DEFAULT_FSC_PERCENT import 추가
- ✅ DEFAULT_FSC_PERCENT_DHL import 추가
- ✅ 프론트엔드 carrier 조건부 defaultFsc 로직
- ✅ 프론트엔드 fscRate = (fscPercent || defaultFsc) / 100
- ✅ 백엔드 calculate_totals carrier 조건부 default_fsc
- ✅ 백엔드 calculate_totals fsc_rate 수정
- ✅ 백엔드 DHL calculate_overseas DEFAULT_FSC_PERCENT_DHL 적용
- ✅ 프론트/백엔드 대칭 확인

---

## 5. 영향 범위

| 영역 | 영향 |
|------|------|
| FSC 미입력 시 UPS 견적 | +48.5% 적절히 반영 (이전: 0%) |
| FSC 미입력 시 DHL 견적 | +46.0% 적절히 반영 (이전: 0%) |
| FSC 직접 입력 시 | 변경 없음 (input 값 우선) |
| Admin FscRateWidget 설정값 사용 시 | 변경 없음 (DB 값 우선) |
| 기존 저장된 견적 | 영향 없음 (재계산 없음) |

---

## 6. 회고 (Retrospective)

### 잘 된 점
- 증상(가격 오류 %) → 계산 파이프라인 역추적 → 근본 원인(FSC 0%) → 수정 경로가 명확했음
- 프론트/백엔드 대칭 로직 구조 덕분에 수정 패턴이 동일해 신속 처리
- bkit gap-detector로 100% 검증 확인

### 개선점
- `|| 0` 패턴 대신 `|| DEFAULT_FSC_PERCENT` 같이 명시적 기본값을 처음부터 사용했어야 함
- 캐리어별 분기 로직 초기 구현 시 DHL 경로 누락이 발생한 것은 코드 리뷰 강화로 방지 가능

---

## 7. 후속 작업

1. **백엔드 배포** (긴급): `git subtree push --prefix=smart-quote-api api-deploy main`  
   → Render.com에 수정된 `quote_calculator.rb` 반영 필요
2. **FSC 입력 UI 기본값 표시**: FscRateWidget 또는 QuoteCalculator에서 "현재 FSC: UPS 48.5% / DHL 46.0%" 기본값을 사용자에게 명시적으로 보여주는 UX 개선 고려
3. **회귀 테스트 추가** (권장): FSC 미입력 시 기본값 적용 여부를 검증하는 단위 테스트 추가

---

*Generated via bkit PDCA /pdca report — 2026-04-13*

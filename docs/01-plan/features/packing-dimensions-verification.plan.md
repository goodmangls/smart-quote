# Plan: packing-dimensions-verification

> Packing dimensions(+10/+10/+15cm, weight × 1.1 + 10) 적용 로직의 운영 일치성 검증 및 UI 명확화

## 1. 배경 (Why)

### 발견 경위

2026-05-04, BridgeLogis.com 화면에서 UPS ICN→MEL 견적 산출 시 **raw 치수 기준 Volumetric Weight 42.13kg**로 계산됨이 확인됨.

| 구분 | Volumetric WT | Chargeable WT | 비고 |
|------|--------------|--------------|------|
| **현재 화면 출력 (raw)** | 42.13 kg | 43.0 kg | Packing 미적용 추정 |
| **Packing 적용 시** | ~88.8 kg | ~89.0 kg | +10/+10/+15cm 가정 |

`applyPackingDimensions()` 코드(`src/lib/packing-utils.ts`)에 의하면 `PackingType.NONE`일 때만 raw 치수 사용. 화면 시나리오에서 **PackingType 기본값/사용자 인지 여부 검증 필요**.

### 핵심 질문

1. 화면 견적 작성 시 **PackingType 기본값**은 무엇인가? (NONE / WOODEN / CARDBOARD ...)
2. 사용자(Admin/Member)가 **Packing 적용 여부를 인지/선택**할 수 있는가?
3. 실제 carrier 측정 시 carrier가 **buffer(+10/+10/+15cm) 적용한 dimension으로 청구**하는데, Packing=NONE으로 견적하면 **과소 청구 리스크** 발생하지 않는가?

### 영향도

- **HIGH**: Packing이 적용되어야 할 화물에 미적용 시 청구 누락 (carrier 실 청구 vs 시스템 견적 차이)
- **MEDIUM**: UI에서 Packing 옵션 명시성 부족 시 운영자 휴먼 에러
- **LOW**: 코드 로직 자체 변경은 불필요 (이미 옵션 분기 구현됨)

## 2. 검증 대상

### V-1. 화면 기본값 추적

#### V-1a. PackingType 기본값
- **파일**: `src/types.ts` (PackingType enum)
- **파일**: `src/features/quote/components/InputSection.tsx` (또는 form 초기값 위치)
- **확인**: `defaultValues` 또는 `useState` 초기값 — 무엇이 기본인가?
- **목표**: 기본값 명시 + 운영 정책 일치 여부 확인

#### V-1b. Special Packing UI 노출 조건
- **파일**: `src/features/quote/components/InputSection.tsx`
- **확인**: Member에게도 Packing 선택 UI 노출되는가? (Admin 전용 옵션인지)
- **CLAUDE.md 명시**: "Special Packing options" → Admin 전용 (Role-Based Access 표 참조)

### V-2. 적용 로직 단위 테스트 검증

#### V-2a. applyPackingDimensions() 테스트
- **파일**: `src/lib/packing-utils.test.ts` (존재 여부 확인)
- **확인**: 6 PackingType 모두 테스트 커버리지
- **수정 (없으면)**: 단위 테스트 추가

#### V-2b. 실 시나리오 골든 테스트
- **목표**: Korea→Melbourne 시나리오 (3 ctns, 0.211 m³)에 대해
  - PackingType.NONE → ₩829,500 (현재 화면)
  - PackingType.CARDBOARD → 예상값 산출 후 골든 테스트
- **파일**: `src/features/quote/services/calculationService.test.ts`

### V-3. UI 명확화 (필요 시)

#### V-3a. 견적 결과에 Packing 적용 여부 표기
- **파일**: `src/features/quote/components/ResultSection.tsx` (또는 PackingTypeInfo)
- **추가**: Chargeable WT 옆 "(Packing applied: +10/+10/+15cm)" 또는 "(Raw dimensions)" 라벨
- **목적**: 운영자가 한눈에 인지 가능

#### V-3b. PDF 견적서에 Packing 명시
- **파일**: `src/lib/pdfService.ts`
- **추가**: 견적서 cargo 섹션에 "Packing Type: [선택값]" 라인

## 3. 검증 절차 (Discovery Phase)

이 Plan은 검증 단계가 우선이며, 발견 사항에 따라 Design Phase에서 구현 범위 결정.

```
Step 1: 코드 베이스에서 PackingType 기본값 추적
        - InputSection.tsx 의 form initial state
        - calculationService 호출 시점의 input.packingType

Step 2: 실제 화면 (BridgeLogis.com) 에서 입력 시도
        - 위에서 찾은 기본값과 화면 동작 비교
        - Admin/Member 두 역할 모두 테스트

Step 3: 운영 정책 확인 (사용자 인터뷰)
        - 모든 견적은 Packing 가정인가? 아니면 기본값 = NONE 정책?
        - Packing 비용은 별도 청구인가? 운임에 포함인가?

Step 4: 발견 사항 기반 Design 작성
        - Case A (정책=NONE 기본): UI 명확화만
        - Case B (정책=Packing 기본): 기본값 변경 + 마이그레이션
        - Case C (사용자 선택 강제): 기본값 제거, validation 추가
```

## 4. 비대상 (Out of Scope)

- ❌ `PACKING_DIM_ADDITIONS` 값 변경 (+10/+10/+15cm는 회사 정책)
- ❌ `PACKING_WEIGHT_BUFFER` 값 변경 (1.1)
- ❌ Packing 비용 계산 로직 (별 PDCA — itemCalculation.ts)

## 5. 위험 (Risks)

| 위험 | 가능성 | 영향 | 대응 |
|------|-------|------|------|
| 기존 견적 데이터의 Packing 적용 일관성 미보증 | 중 | 중 | DB 조회로 audit 후 정책 결정 |
| 정책 변경 시 기존 운영자 학습 필요 | 중 | 저 | USER_GUIDE 업데이트 + 공지 |
| Carrier 실측 vs 시스템 견적 차이 누적 | 고 | 고 | 본 Plan의 핵심 — Discovery 결과로 결정 |

## 6. 검증 산출물

검증 단계 완료 시 다음 4개 산출물:

1. **PackingType 기본값 보고서** — 코드 + 화면 + 정책 3-way 비교
2. **단위 테스트 커버리지 보고서** — `applyPackingDimensions()` 6 case
3. **골든 시나리오 테스트** — Korea→Melbourne 3 ctns 케이스
4. **운영 정책 문서** — `docs/USER_GUIDE_ADMIN.md`에 Packing 섹션 추가/보완

## 7. 후속 작업

- 발견 결과 → `/pdca design packing-dimensions-verification`
- 또는 단순 UI 명확화로 종결 시 `/pdca do` 직행

---

**작성일**: 2026-05-04
**작성자**: Claude Code (사용자 의뢰)
**우선순위**: HIGH
**예상 소요**: Discovery 1-2시간 + 구현 별도 산정
**관련 이슈**: 해외 파트너 견적 #1 (UPS ICN→MEL Z4) — 0.211 m³ raw 사용 의문
**의존성**: 없음 (margin-formula-clarification과 독립)

# Plan: margin-formula-clarification

> CLAUDE.md Margin 공식 표기를 실제 시스템 동작(Markup 방식)에 맞게 정정

## 1. 배경 (Why)

### 발견 경위

2026-05-04, 해외 파트너 UPS Korea→Melbourne 견적 작성 중 시스템 출력값(₩829,500)과 수동 계산값(₩880,100) 사이 ₩50,600 (약 6.1%) 불일치 발견. 추적 결과 **마진 공식 자체가 다름** 확인:

| 구분 | 공식 | 결과 (Cost ₩454,252, 24% margin) |
|------|------|--------------------------------|
| **시스템 실제 동작** | `revenue = cost × (1 + margin%)` (Markup) | ₩563,272 |
| **CLAUDE.md 명세** | `revenue = cost / (1 - margin%)` (Margin Rate) | ₩597,700 |

### 회사 정책 확정

**Markup 방식(× 1.24)이 정확한 회사 정책**으로 확정됨 (2026-05-04, 사용자 확정).
→ 시스템 코드는 정확하며 **CLAUDE.md 명세만 수정** 필요.

### 영향도

- **HIGH**: AI Agent가 견적 산출/검증 시 명세 따라가면 6.1% 과다 청구
- **HIGH**: 신규 합류 개발자가 명세 신뢰 시 코드 오류로 오해할 수 있음
- 실제 시스템 견적은 정상 (코드는 옳음)

## 2. 수정 대상

### Primary

#### P-1. CLAUDE.md Margin 공식 표기 정정
- **파일**: `CLAUDE.md` (worktree + main)
- **위치**: "Calculation Pipeline" 섹션 3번 항목
- **현재 (잘못됨)**:
  ```
  3. **Margin** - Dynamic margin via `MarginRuleResolver` ...
     `revenue = cost / (1 - margin%)`, rounded up to nearest KRW 100.
  ```
- **수정 (정확)**:
  ```
  3. **Margin** - Dynamic margin via `MarginRuleResolver` ...
     `revenue = cost × (1 + margin%)` (Markup 방식),
     rounded up to nearest KRW 100.
  ```
- **추가 명시**: "Markup 방식 — 매출 대비 실효 마진율은 명목값보다 낮음 (예: 24% Markup → 실효 마진율 19.35%)"

### Secondary (참조 문서)

#### S-1. USER_GUIDE_ADMIN.md 마진 설명 검토
- **파일**: `docs/USER_GUIDE_ADMIN.md`
- **확인 사항**: 마진율 설정 위젯 설명에 공식 언급 여부
- **수정**: 공식 언급 시 "Markup" 명시

#### S-2. 견적 PDF 표기 (선택)
- **파일**: `src/lib/pdfService.ts`
- **확인 사항**: PDF 출력에 "Margin %" 또는 "Markup %" 라벨
- **수정**: 필요 시 라벨 명확화 (사용자 결정 후)

## 3. 비대상 (Out of Scope)

- ❌ 시스템 코드 수정 (`calculationService.ts`, `quote_calculator.rb`) — **이미 정확**
- ❌ Margin Rule 데이터 (24% 값 자체는 정책 그대로)
- ❌ FSC 적용 로직 변경

## 4. 구현 순서

```
1. CLAUDE.md 공식 표기 수정 (P-1)
2. USER_GUIDE_ADMIN.md 검토 및 필요 시 수정 (S-1)
3. PDF 라벨 검토 (S-2) — 선택
4. 변경 사항 commit + push (양 worktree 동기화)
```

## 5. 검증

### 코드 검증 (변경 없음 확인)

```bash
grep -n "1 + .*margin" src/features/quote/services/calculationService.ts
# → "baseRate * (1 + safeMarginPercent / 100)" 그대로

grep -n "1 + @safe_margin" smart-quote-api/app/services/quote_calculator.rb
# → "base_rate * (1 + @safe_margin_percent / 100.0)" 그대로
```

### 문서 검증

```bash
grep "revenue = cost" CLAUDE.md
# → 결과: "revenue = cost × (1 + margin%)" (수정 후)
```

### 견적 일치 검증

다음 입력으로 시스템과 명세 기반 수동 계산 일치 확인:
- Cost: ₩454,252
- Margin: 24%
- 기대값: ₩454,252 × 1.24 = **₩563,272**

## 6. 위험 (Risks)

| 위험 | 가능성 | 영향 | 대응 |
|------|-------|------|------|
| 다른 문서에 잘못된 공식 산재 | 중 | 중 | grep으로 전수 검색 |
| 회사가 추후 Margin Rate 방식으로 정책 변경 시 | 저 | 고 | 본 Plan은 현재 정책 기준이며, 정책 변경 시 별도 PDCA |
| 매출 대비 실효 마진율 혼동 (운영 현업) | 중 | 저 | 정정 표기에 19.35% 예시 명시 |

## 7. 후속 작업

- ✅ 본 Plan 완료 시 `/pdca design margin-formula-clarification` (선택 — 단순 텍스트 수정이라 design 단계 생략 가능)
- ✅ Plan #2 (`packing-dimensions-verification`) 진행
- ✅ Plan #3 (`overseas-partner-markup-rule`) 진행

---

**작성일**: 2026-05-04
**작성자**: Claude Code (사용자 의뢰)
**우선순위**: HIGH
**예상 소요**: 30분 (단순 문서 수정)
**관련 이슈**: 해외 파트너 견적 #1 (UPS ICN→MEL Z4)

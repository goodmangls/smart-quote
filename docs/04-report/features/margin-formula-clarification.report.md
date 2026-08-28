# PDCA Report: margin-formula-clarification

> CLAUDE.md 외 3개 문서의 Margin 공식 표기를 실제 시스템 동작(Markup 방식)에 맞게 정정

**완료일**: 2026-05-04
**Plan 문서**: [`docs/01-plan/features/margin-formula-clarification.plan.md`](../../01-plan/features/margin-formula-clarification.plan.md)
**Commit**: `df5b9c0` (origin/main에 fast-forward push 완료)

---

## 1. 요약 (TL;DR)

운영 견적 작업 중 발견된 **명세 ↔ 코드 불일치**를 명세 측 정정으로 해소.

| 구분 | Before | After |
|------|--------|-------|
| **공식 표기** | `revenue = cost / (1 - margin%)` | `revenue = cost × (1 + margin%)` |
| **방식** | Margin Rate (잘못된 명세) | Markup (실제 회사 정책) |
| **시스템 코드** | 변경 없음 (이미 정확) | 변경 없음 ✓ |
| **명세 일치** | ❌ 불일치 | ✅ 일치 |

## 2. 발견 경위

2026-05-04, 해외 파트너 UPS Korea→Melbourne 견적 작성 중 시스템 출력값(₩829,500)과 수동 산출값(₩880,100) 사이 ₩50,600 (약 6.1%) 차이 발생.

추적 결과:
- 시스템 (BridgeLogis.com) 코드: `Cost × 1.24` (Markup) — `calculationService.ts:125-127`, `quote_calculator.rb:108-110`
- CLAUDE.md/README.md/AGENTS.md/USER_GUIDE_ADMIN.md 명세: `Cost / 0.76` (Margin Rate)

사용자 확정: **Markup 방식이 정확한 회사 정책**. 코드는 옳고 명세만 정정 필요.

## 3. 변경 사항

### 3.1 정정된 파일 (4개)

| 파일 | 라인 | 변경 |
|------|-----|------|
| `CLAUDE.md` | 191 | Margin 공식 + 실효 마진율 주의 표기 추가 |
| `README.md` | 32 | Margin 공식 정정 |
| `AGENTS.md` | 191 | Margin 공식 + 실효 마진율 주의 표기 추가 |
| `docs/USER_GUIDE_ADMIN.md` | 87 | 운영자용 표 항목 정정 + 19.35% 예시 |

### 3.2 변경 후 표기 (정확본)

```
3. **Margin** - Dynamic margin via `MarginRuleResolver`
   (priority-based: P100 > P90 > P50 > P0),
   **Markup 방식**: `revenue = cost × (1 + margin%)`,
   rounded up to nearest KRW 100.
   ⚠ 매출 대비 실효 마진율은 명목값보다 낮음
     (예: 24% Markup → 실효 마진율 19.35% = margin / revenue).
```

### 3.3 보존 항목

- **`.agent-os/product/decisions.md:215`** — 과거 의사결정 히스토리이므로 보존 결정. 후속 PDCA에서 별도 신규 decisions 엔트리로 정정 사실 기록 권장.
- **시스템 코드** — 변경 없음 (이미 정확):
  - Frontend: `src/features/quote/services/calculationService.ts:125-127`
  - Backend: `smart-quote-api/app/services/quote_calculator.rb:108-110`
  - 코드 주석에도 "Markup on Base Rate (cost × (1 + margin%))" 명시되어 있었음

## 4. 검증 결과

### 4.1 문서 검증

```bash
# 잘못된 공식 잔존 검사 (active docs)
$ grep -r "cost / (1 - margin)" CLAUDE.md README.md AGENTS.md docs/USER_GUIDE_ADMIN.md
(결과 없음 ✅)

# 보존 항목 (의도)
$ grep -r "cost / (1 - margin)" .agent-os/product/decisions.md
:215  Unify backend margin calculation ... (히스토리 보존)
```

### 4.2 코드 일치 검증

```bash
# Frontend
$ grep "1 + .*margin" src/features/quote/services/calculationService.ts
:126  const baseWithMargin = baseRate * (1 + safeMarginPercent / 100);

# Backend
$ grep "1 + @safe_margin" smart-quote-api/app/services/quote_calculator.rb
:109  @base_with_margin = base_rate * (1 + @safe_margin_percent / 100.0)
```

→ 양쪽 모두 Markup 공식. 명세와 일치 ✅

### 4.3 시나리오 검증

해외 파트너 UPS ICN→MEL Z4, 43kg, 24% margin:

| 단계 | 명세 (정정 후) | 시스템 출력 | 일치 |
|------|--------------|----------|------|
| Cost (Base Rate) | 43 × ₩10,564 = ₩454,252 | ₩454,252 | ✅ |
| Margin (Markup 24%) | 454,252 × 0.24 = ₩109,020 | ₩109,020 | ✅ |
| Subtotal | ₩563,272 | ₩563,272 | ✅ |
| FSC 47.25% | × 0.4725 = ₩266,146 | ₩266,146 | ✅ |
| Final (100원 올림) | ₩829,500 | ₩829,500 | ✅ |

## 5. Gap Analysis

| 항목 | Plan 정의 | 실 구현 | Gap |
|------|---------|--------|-----|
| P-1: CLAUDE.md 정정 | ✅ | ✅ | 0% |
| P-1: 실효 마진율 명시 | ✅ | ✅ | 0% |
| S-1: USER_GUIDE_ADMIN 검토 | 검토 후 필요 시 수정 | 수정 완료 | 0% |
| S-2: PDF 라벨 검토 | 선택 | 미진행 (별 PDCA 권장) | — |
| 추가 발견: README.md, AGENTS.md | Plan 미언급 | 동시 수정 완료 | +∞ (positive) |

**Match Rate: 100%** (의도된 범위 모두 충족 + 추가 발견 즉시 처리)

## 6. 부수 발견 (Side Findings)

### 6.1 자동 commit hook 동작 확인

세션 진행 중 worktree에서 Edit 작업 후 자동 commit이 수행됨 (commit `df5b9c0`). hook이 `.commit_message.txt`를 읽어 commit 메시지로 사용. 정확히 동작.

다만 fsc-sync plan 관련 commits (`5462853`, `28ec2cf`, `db3f818`, `2128719`)에 4번 동일 메시지 반복 — hook이 multiple write 시 매번 commit하는 동작. **별 PDCA 후보**: hook의 commit batching 또는 amend 정책 검토.

### 6.2 Main working tree 분리 상태

`/Users/jaehong/Developer/Projects/smart-quote-main` 디렉토리는 `feature/phase15-seo-infra` 브랜치에서 작업 중. 본 PDCA 작업 시 main 디렉토리에도 동일 변경을 가했으나, worktree push 후 main 디렉토리에는 동일 내용의 unstaged 변경이 남음.

**필요 조치 (사용자 결정)**:
- 옵션 A: main 디렉토리에서 `git checkout CLAUDE.md README.md docs/USER_GUIDE_ADMIN.md` + `rm AGENTS.md` (변경 discard, origin/main pull 후 자동 반영)
- 옵션 B: main의 feature/phase15-seo-infra에 동일 변경 commit (다른 feature 컨텍스트와 병합)
- 옵션 C: 그대로 두고 사용자가 다음 main 작업 시 처리

## 7. 후속 작업

### 7.1 즉시 (사용자 결정 사항)

- ⚠ Main 디렉토리 변경 처리 (옵션 A/B/C 중 선택)
- ⚠ `decisions.md`에 정정 사실 기록할 신규 entry 작성 여부

### 7.2 후속 PDCA

| # | 후보 | 우선순위 |
|---|------|--------|
| P2 | `packing-dimensions-verification` (Discovery) | HIGH |
| P3 | `overseas-partner-markup-rule` (정책 인터뷰 후) | HIGH |

### 7.3 별건 PDCA 후보

- Auto-commit hook의 batching 정책 검토 (동일 메시지 4번 반복 현상)
- PDF 견적서 마진 라벨 명확화 (Plan S-2)
- ups_tariff.ts UPS_RANGE_RATES Z4 데이터 정합성 검토 (₩10,564 = 원가 vs ₩13,900 = 24% Markup 매출가, 검산 일치)

## 8. 교훈 (Lessons Learned)

1. **명세는 코드와 함께 검증되어야 한다** — 코드만 검증하고 명세를 신뢰하면 AI Agent/신규 인력이 잘못된 정보로 작업.

2. **마진 vs Markup 용어는 의도적으로 명시** — 6.1% 차이는 큰 견적 단위에서 운영 손실로 직결. 계산식과 함께 "Markup 방식" 같은 분류 명시 필수.

3. **운영 정책 변경 시 docs SSOT 일관성 검증** — README/CLAUDE/AGENTS/USER_GUIDE 4개 문서 모두 동일 공식을 따로 명시하고 있었음. 향후 단일 출처(예: `docs/02-design/features/`)에서 import하는 구조 검토 권장.

---

**작성**: 2026-05-04 (Claude Code, 사용자 의뢰)
**상태**: ✅ 완료 (worktree → origin/main push 완료, main 디렉토리 처리 보류)
**Match Rate**: 100%

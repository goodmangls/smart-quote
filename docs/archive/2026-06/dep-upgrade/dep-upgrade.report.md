---
template: report
version: 1.1
feature: dep-upgrade
date: 2026-06-07
author: jhlim725
project: j-ways-smart-quote-system
status: complete
---

# dep-upgrade Completion Report

> **Status**: Complete (PR #34 merged `21c11b9` + prod npm audit 0 vulnerabilities + 전 CI green)
>
> **Project**: j-ways-smart-quote-system (Goodman GLS / J-Ways, bridgelogis.com)
> **Author**: jhlim725
> **Completion Date**: 2026-06-07
> **PDCA Cycle**: Plan → Do → Report (Check = npm audit + FE 전 검증 + real-jsPDF 테스트; Design 생략 — 의존성 업그레이드)
> **Parent**: codebase-health-2026-06-07 H1

---

## 1. Summary

| Item | Content |
|------|---------|
| Feature | dep-upgrade (prod 런타임 취약 의존성 업그레이드) |
| Source | codebase-health-2026-06-07.analysis.md H1 |
| PR | #34 `21c11b9` (admin squash, base main) |
| 결과 | **prod `npm audit` = 0 vulnerabilities**, 앱 코드 무변경 |

### 1.1 What shipped

| 패키지 | 변경 | 취약점 해소 |
|--------|------|-------------|
| `react-router-dom` (+`react-router`) | 7.13.1 → 7.17.0 | high turbo-stream RCE (v7 minor, non-breaking) |
| `jspdf` | 2.5.1 → 4.2.1 | **critical** ReDoS |
| `jspdf-autotable` | 5.0.7 → 5.0.8 | jspdf 4 호환 (peer `^2\|\|^3\|\|^4`) |
| `dompurify` (transitive via jspdf) | 2.5.8 → 3.4+ | moderate XSS |

## 2. Verification (Check)

| 게이트 | 결과 |
|--------|------|
| `npm audit --omit=dev` (prod) | ✅ **0 vulnerabilities** (react-router/jspdf/dompurify 전부 해소) |
| tsc / lint / vitest | ✅ 0 / 0 / **1447 pass** |
| build | ✅ 성공 |
| PDF 회귀 (real `new jsPDF()`) | ✅ `pdfLayout.test.ts` + `pdfService.test.ts` **8 pass** → jspdf major breaking 0 |
| R-1 (jspdf-autotable 호환) | ✅ 해소 (peer deps `^2\|\|^3\|\|^4`) |
| diff 범위 | ✅ package.json/lock만 (앱 코드 무변경) |
| CI (PR #34) | ✅ 전 job green (재실행 후) |

> **잔여 — 수동 PDF 육안**: 헤드리스 환경상 시각 레이아웃은 단위테스트로 완전 포착 불가. real-jsPDF 테스트(레이아웃/높이 계산)가 강한 안전망이나, 배포 후 견적 PDF 다운로드로 폰트·autoTable 표 육안 1회 확인 권장.

## 3. Key event — "로컬 ≠ CI" 3번째 사례 (flaky 발견)

| 단계 | 내용 |
|------|------|
| 증상 | PR #34 `check` job 1회 fail: vitest "Unhandled Error: **window is not defined**" (CustomerDashboard.test.tsx) |
| 진단 | 제 diff는 **package.json만**(src 무변경). `useExchangeRates.ts:53,64,82` 폴링 `setInterval`/`window.addEventListener('online')` async가 jsdom teardown 후 발현. **pre-existing 테스트 위생 flaky** |
| 검증 | 로컬 동일 테스트 **5/5 pass**, 동일 커밋 CI **재실행 green** → 타이밍 의존, dep-upgrade 무관 |
| 조치 | dep-upgrade 머지(정확). flaky는 **Task #8 + 분석 M7**로 분리 추적(`dashboard-test-flakiness` 후보) |

## 4. Lessons Learned

1. **"trivial" 가정 검증** — npm `isSemVerMajor` 플래그로 jspdf가 major(2→4)임을 사전 포착. 단순 패치로 오판했으면 PDF 회귀를 놓쳤을 것. 업그레이드 전 `npm outdated`/`audit --json`로 major/breaking·transitive·peer 확인. → [[feedback_capability_precheck]]
2. **major 업그레이드는 안전망이 핵심** — `pdfLayout.test.ts`가 실제 jsPDF를 쓴 덕에 jspdf 4 breaking을 자동 검증. 시각 회귀는 별도(수동).
3. **로컬 green ≠ CI green (또)** — 이번 세션 3번째(stale-tree·seed pollution·flaky teardown). CI 1회 fail은 즉시 단정 말고 재실행+로컬 반복으로 flaky 여부 판정.

## 5. Follow-up

| 항목 | 상태 |
|------|------|
| `dashboard-test-flakiness` (Task #8) — useExchangeRates teardown async 가드 / fake timers | ⏳ 미시작, **CI 안정성 우선** 권장 |
| 수동 PDF 육안 (배포 후) | ⏳ |
| dev 전용 취약(vite/vitest/tar 등) `npm audit fix` | ⏳ 범위 밖 |
| backend-rubocop-gate (#6) / addon-panel-consolidation (#7) | ⏳ 코드분석 후속 |

## 6. Artifacts

| Type | Path |
|------|------|
| Plan | `docs/01-plan/features/dep-upgrade.plan.md` |
| Report | `docs/04-report/features/dep-upgrade.report.md` (this) |
| Analysis (parent) | `docs/03-analysis/codebase-health-2026-06-07.analysis.md` H1 (미커밋) |
| PR | #34 `21c11b9` |

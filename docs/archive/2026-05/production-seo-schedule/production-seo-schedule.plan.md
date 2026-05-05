# Plan: production-seo-schedule

> Production(bridgelogis.com) 대상 주기적 Lighthouse SEO 측정 워크플로 — phase-1.5-seo-infra 사이클에서 warn 처리된 SEO ≥ 0.90 게이트 복원

## 1. 개요

| 항목 | 내용 |
|------|------|
| Feature | production-seo-schedule |
| 우선순위 | High (phase-1.5 후속, SEO 게이트 복원) |
| 영향 범위 | `.github/workflows/` 신규 1개, `lighthouserc.production.json` 신규 1개 |
| 시작일 | 2026-05-05 |
| 차단 | 없음 (PR #3 머지 완료, production 배포는 자동) |
| 사용자 결정 필요 | (1) 실행 주기, (2) 알림 채널 |

### 배경

PR #3(`feature/phase15-seo-infra`) 머지 시 `lighthouserc.preview.json` 의 `categories:seo` 어설션이 `error → warn` 로 완화됨. 이유:

- Vercel preview deployment 는 자동으로 `X-Robots-Tag: noindex` 헤더 주입
- Lighthouse SEO category 의 "Page is not blocked from indexing" audit 이 강제 fail
- preview SEO score 0.66 (실 score 와 무관하게 noindex 가중치 큰)

→ preview 환경에서는 SEO 0.90 달성 불가 (Vercel 플랫폼 동작, 비활성화 불가).

**결과**: PR-level SEO gate 가 사실상 무효화. production(`bridgelogis.com`) 은 noindex 가 없으므로 실제 SEO score 측정 가능하지만 현재 자동 게이트가 없음.

### 목표

- production 배포된 `bridgelogis.com` 을 대상으로 주기적(예: 주 1회) Lighthouse 실행
- SEO category score 가 0.90 미만 떨어지면 **GitHub Issue 자동 생성** (또는 Slack 알림)
- score 추이 artifact 보존으로 회귀 추적 가능

## 2. 현황 진단

```
phase-1.5-seo-infra 산출물:
  ✓ lighthouserc.json (CI 용, staticDistDir, url=["/"])
  ✓ lighthouserc.preview.json (preview 용, urls 워크플로 입력 + SEO warn)
  ✓ .github/workflows/seo-checks.yml (PR 시점 검증)

production 검증:
  ✗ bridgelogis.com 대상 정기 lighthouse 워크플로 없음
  ✗ SEO score 회귀 알림 없음
  ✗ 점수 추이 archive 없음
```

memory `project_smart_quote_phase15_seo_blockers.md` 에 트레이드오프 기록됨:
> production SEO 검증은 별도 schedule 워크플로(예: schedule 또는 production 배포 후 main 브랜치 lighthouse) 로 분리 필요

## 3. 구현 범위

### 3.1 신규 워크플로 — `.github/workflows/seo-production-monitor.yml`

```yaml
name: Production SEO Monitor

on:
  push:
    branches: [main]       # 머지 즉시 회귀 감지
  schedule:
    - cron: '0 17 * * 0'   # 매주 일요일 17:00 UTC = 월요일 02:00 KST baseline
  workflow_dispatch: {}    # 수동 실행 허용

permissions:
  contents: read
  issues: write             # 점수 미달 시 issue 생성

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - name: Install xmllint
        run: sudo apt-get update -qq && sudo apt-get install -y -qq libxml2-utils
      - name: Lighthouse on production
        uses: treosh/lighthouse-ci-action@v12
        with:
          urls: |
            https://bridgelogis.com/
            https://bridgelogis.com/quote
            https://bridgelogis.com/guide
          configPath: ./lighthouserc.production.json
          uploadArtifacts: true
          temporaryPublicStorage: true
      - name: Open issue on regression
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            const url = `https://github.com/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`;
            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `🚨 Production SEO regression detected (${new Date().toISOString().slice(0,10)})`,
              body: `Lighthouse SEO score dropped below threshold on bridgelogis.com.\n\nRun: ${url}\n\n_Auto-created by production-seo-monitor workflow._`,
              labels: ['seo', 'regression', 'auto']
            });
```

### 3.2 신규 config — `lighthouserc.production.json`

```json
{
  "ci": {
    "collect": {
      "numberOfRuns": 3,
      "settings": {
        "preset": "desktop",
        "chromeFlags": "--no-sandbox --headless"
      }
    },
    "assert": {
      "assertions": {
        "categories:performance":    ["warn",  { "minScore": 0.75 }],
        "categories:accessibility":  ["error", { "minScore": 0.90 }],
        "categories:best-practices": ["warn",  { "minScore": 0.85 }],
        "categories:seo":            ["error", { "minScore": 0.90 }],
        "categories:pwa":            "off",
        "uses-rel-preconnect":       "off",
        "no-vulnerable-libraries":   "off"
      }
    },
    "upload": {
      "target": "filesystem",
      "outputDir": "./.lighthouseci"
    }
  }
}
```

`lighthouserc.preview.json` 과 동일하지만 **`categories:seo` 가 `error`** (production 은 noindex 없으므로 0.90 달성 가능).

## 4. 사용자 결정 (확정 2026-05-05)

### 4.1 실행 주기 — **옵션 C 채택**

```
on:
  push:
    branches: [main]
  schedule:
    - cron: '0 17 * * 0'   # 매주 일요일 17:00 UTC = 월요일 02:00 KST baseline
  workflow_dispatch: {}
```

main push 직후 + 주간 baseline. 변경 즉시 회귀 감지 + drift 추적 동시.

### 4.2 알림 채널 — **옵션 A 채택**

GitHub Issue 자동 생성 (`actions/github-script@v7` 사용).
Slack 연동은 후속 사이클로 분리.

### 4.3 (참고) 기각된 옵션

| 옵션 | 사유 |
|------|------|
| 4.1-A (주 1회만) | 회귀 감지 7일 지연이 production SEO 게이트 의도와 부합하지 않음 |
| 4.1-B (매일) | main push trigger 가 이미 실시간이므로 매일 cron 은 중복 |
| 4.2-B (Slack) | Slack webhook secret 등록·관리 부담 — 본 사이클 외 |
| 4.2-C (A+B) | 노이즈 회피 |

## 5. 검증 (PR Test plan)

- [ ] `npm run lint` PASS (워크플로/json 파일만 추가, 코드 영향 없음)
- [ ] workflow_dispatch 로 수동 트리거 → 정상 실행 확인
- [ ] bridgelogis.com 라이브에 대해 SEO score 측정 결과 출력
- [ ] 인위적으로 lighthouserc.production.json 의 SEO 임계값을 1.0 으로 올려 fail 시뮬레이션 → issue 자동 생성 확인 후 원복
- [ ] cron schedule 등록 검증 (다음 예정 시각 표시)

## 6. 후속 작업

| 작업 | 트리거 |
|------|--------|
| Design 문서 (`docs/02-design/features/production-seo-schedule.design.md`) | 본 plan 후 `/pdca design` |
| Implementation | Design 후 `/pdca do` |
| Gap 분석 | 구현 후 `/pdca analyze` |
| color-contrast 사이클 | 본 사이클 머지 후 별도 |
| Insights Phase 2 사이클 | color-contrast 와 병행 가능 |

## 7. 위험 요소

| 위험 | 완화 |
|------|------|
| Vercel rate limiting (lighthouse 3 runs × 3 URLs = 9 requests) | numberOfRuns 1 로 축소 가능 |
| bridgelogis.com 일시 다운으로 워크플로 fail | retry 3회 + 별도 monitoring 채널 |
| lhci 공개 storage 만료 (7일) | artifact 별도 보관 (uploadArtifacts: true) |
| color-contrast 등 a11y audit 변동으로 SEO 외 카테고리 fail | accessibility 도 별도 사이클 도입 시 정리 |

---

**작성**: 2026-05-05
**작성자**: Claude Code (`/pdca plan`)
**의존**: phase-1.5-seo-infra (머지 완료, b1bfd40)

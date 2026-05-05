# Production SEO Schedule — Design Document

> **Summary**: bridgelogis.com production 환경에 대한 주기적/이벤트 기반 Lighthouse SEO 모니터링과 회귀 시 자동 GitHub Issue 생성 메커니즘
>
> **Project**: Smart Quote System (smart-quote-main)
> **Version**: 0.0.0
> **Author**: Claude Code (`/pdca design`)
> **Date**: 2026-05-05
> **Status**: Locked (사용자 결정 완료)
> **Planning Doc**: [production-seo-schedule.plan.md](../../01-plan/features/production-seo-schedule.plan.md)
> **Depends on**: phase-1.5-seo-infra (merged b1bfd40)

---

## 1. Overview

### 1.1 Design Goals

- phase-1.5에서 warn 처리된 SEO ≥ 0.90 게이트를 production 도메인에서 error 강도로 복원
- main push 즉시 + 주간 baseline 두 트리거로 회귀 즉시 감지 + drift 추적
- 회귀 발생 시 GitHub Issue 자동 생성으로 추적 가능한 알림
- 0 코드 변경, 신규 CI 인프라(.yml + .json) 2건만 추가

### 1.2 Design Principles

- **Production-only target**: Vercel preview 의 noindex 영향 회피 — 실제 SEO 측정값 사용
- **Read-only by default**: 워크플로는 PR/배포 차단 안 함 (이미 머지·배포된 상태 측정). issue 생성으로만 통지
- **Idempotent issue 생성**: 같은 회귀가 반복돼도 daily 단위로 1개 issue 만 생성 (`actions/github-script` 에서 same-day open issue 검색 후 중복 방지 또는 sticky title)
- **Existing config 재사용**: `lighthouserc.preview.json` 패턴 따라 `lighthouserc.production.json` 만 새로 — preset 미사용, 명시 assertions

### 1.3 Non-Goals

- Slack/이메일 직접 알림 (옵션 4.2-B 후속 사이클)
- Performance/A11y 카테고리 강한 게이트 (별도 a11y 사이클 #2 에서 다룸)
- production deployment trigger 자체 (Vercel auto-deploy 가 main push 시 처리, 본 워크플로는 그 후 측정)

---

## 2. Architecture

### 2.1 Component Diagram

```
┌──────────────┐     push to main      ┌─────────────────┐
│  Developer   │ ─────────────────────▶│ GitHub repo     │
└──────────────┘                       │ jlinsights/     │
                                       │ smart-quote     │
                                       └────────┬────────┘
                                                │
                  ┌─────────────────────────────┴──────────────────────────┐
                  │                                                        │
                  ▼                                                        ▼
      ┌────────────────────┐                              ┌─────────────────────────┐
      │ Vercel auto-deploy │                              │ GitHub Actions           │
      │ → bridgelogis.com  │                              │ seo-production-monitor   │
      └────────┬───────────┘                              │  (push + cron + manual)  │
               │ ~30-60s                                  └────────────┬─────────────┘
               ▼                                                       │
      ┌────────────────────┐ ◀──── HTTPS ──── treosh/lighthouse-ci-action@v12
      │ bridgelogis.com    │            (3 URLs × 3 runs = 9 measurements)
      └────────────────────┘
                                                                       │
                                          assertions (lighthouserc.production.json)
                                                                       │
                                            ┌──────────────────────────┴──────────────┐
                                            │                                         │
                                       PASS │                                    FAIL │
                                            ▼                                         ▼
                                    ┌──────────────┐                    ┌─────────────────────┐
                                    │ Job success  │                    │ actions/github-script│
                                    │ artifact     │                    │  → REST issues.create │
                                    │ upload (lhci │                    │  labels: seo,         │
                                    │  + temporary │                    │    regression, auto   │
                                    │  storage)    │                    └─────────────────────┘
                                    └──────────────┘
```

### 2.2 Trigger Matrix

| 이벤트 | 트리거 | 의도 |
|--------|--------|------|
| `push` to `main` | `on.push.branches: [main]` | 머지 후 즉시 회귀 감지 |
| Weekly baseline | `on.schedule: cron '0 17 * * 0'` (Sun 17:00 UTC = Mon 02:00 KST) | drift 추적, baseline 트렌드 |
| Manual | `on.workflow_dispatch: {}` | ad-hoc 검증 (예: production 인프라 변경 후) |
| `pull_request` | **미사용** | preview 는 noindex 로 SEO 측정 무의미 — 별도 워크플로(`seo-checks.yml`)가 PR 검증 담당 |

### 2.3 Data Flow

```
[Trigger]
  ↓
[Job: lighthouse-prod]
  ↓
1. Checkout (lighthouserc.production.json 만 필요)
2. Install Node 20
3. Install xmllint (libxml2-utils) — 후속 smoke test 확장 대비
4. treosh/lighthouse-ci-action@v12
   - urls: 3개 (root + /quote + /guide)
   - configPath: ./lighthouserc.production.json
   - 3 runs per URL → 9 collected runs
5. Assertions evaluated (categories.seo error >= 0.90)
   ↓
   PASS → uploadArtifacts → temporaryPublicStorage → 끝
   FAIL → next step (Open issue on regression)
6. actions/github-script@v7
   - Search existing open issue with sticky title prefix
   - 중복 없으면 create issue with labels: ['seo', 'regression', 'auto']
   - 본문: run URL + 실패 카테고리 요약 + 머지 commit SHA
```

---

## 3. Workflow Spec

### 3.1 File: `.github/workflows/seo-production-monitor.yml`

| 키 | 값 |
|----|----|
| `name` | `Production SEO Monitor` |
| `concurrency` | `production-seo` (cancel in-progress 동일 트리거 방지) |
| `permissions` | `contents: read`, `issues: write` |
| `jobs.lighthouse-prod.runs-on` | `ubuntu-latest` |
| `jobs.lighthouse-prod.timeout-minutes` | 15 (lighthouse 9 runs ~ 5분, buffer 10분) |

#### 3.1.1 Steps (순서대로)

| # | step name | 액션/명령 | 실패 시 |
|---|-----------|-----------|---------|
| 1 | Checkout | `actions/checkout@v4` | hard fail |
| 2 | Setup Node | `actions/setup-node@v4` (node 20) | hard fail |
| 3 | Wait for Vercel deploy | (push trigger only) `patrickedqvist/wait-for-vercel-preview@v1.3.1` with prod URL | timeout 5분 — 그래도 다음 진행 (continue-on-error: true) |
| 4 | Lighthouse | `treosh/lighthouse-ci-action@v12` | assertions fail → 다음 step 으로 진입 |
| 5 | Open issue on regression | `actions/github-script@v7` | `if: failure() && steps.lh.conclusion == 'failure'` |

#### 3.1.2 Step 3 변형 (push vs schedule)

`schedule`/`workflow_dispatch` 트리거에서는 wait step 스킵 (production 이 항상 ready 가정). `push` 트리거에서만 활성화.

```yaml
- name: Wait for Vercel production deploy
  if: github.event_name == 'push'
  run: |
    # Vercel auto-deploy 평균 30-60초 — 안전 마진 90초 sleep + curl 200 확인
    sleep 90
    for i in $(seq 1 30); do
      code=$(curl -sI -o /dev/null -w '%{http_code}' https://bridgelogis.com/)
      if [ "$code" = "200" ]; then echo "✓ live"; exit 0; fi
      sleep 10
    done
    echo "::warning::production not ready after 5min — proceeding anyway"
```

`patrickedqvist/wait-for-vercel-preview` 가 production URL 대응 어려우면 위 curl 폴링이 fallback.

### 3.2 File: `lighthouserc.production.json`

`lighthouserc.preview.json` 와 동일 구조에서 `categories:seo` 만 `error`. 명시 차이:

| 키 | preview | production |
|----|---------|-----------|
| `categories:seo` | `["warn",  { "minScore": 0.90 }]` | `["error", { "minScore": 0.90 }]` |
| `categories:accessibility` | `["error", { "minScore": 0.90 }]` | `["error", { "minScore": 0.90 }]` (동일) |
| `categories:performance` | `["warn",  { "minScore": 0.75 }]` | `["warn",  { "minScore": 0.75 }]` (동일) |
| `numberOfRuns` | 1 | 3 (집계 안정성) |

---

## 4. Issue 자동 생성 로직 (`actions/github-script@v7`)

### 4.1 Sticky title 패턴

```
🚨 Production SEO regression — YYYY-MM-DD
```

### 4.2 의사 코드

```js
const today = new Date().toISOString().slice(0, 10);
const titlePrefix = '🚨 Production SEO regression';
const todayTitle = `${titlePrefix} — ${today}`;

// 1. 같은 날짜의 open issue 검색 (idempotency)
const existing = await github.rest.issues.listForRepo({
  owner, repo, state: 'open',
  labels: 'seo,regression,auto',
  per_page: 20,
});
const dup = existing.data.find(i => i.title === todayTitle);
if (dup) {
  console.log(`Issue already exists today: #${dup.number}`);
  return;
}

// 2. 신규 issue 생성
const runUrl = `https://github.com/${owner}/${repo}/actions/runs/${context.runId}`;
const sha = context.sha.slice(0, 7);
const trigger = context.eventName;

await github.rest.issues.create({
  owner, repo,
  title: todayTitle,
  body: [
    `Lighthouse SEO score dropped below threshold on bridgelogis.com.`,
    ``,
    `- **Trigger**: \`${trigger}\``,
    `- **Commit**: \`${sha}\``,
    `- **Run**: ${runUrl}`,
    `- **Threshold**: SEO ≥ 0.90 (error)`,
    ``,
    `## Next steps`,
    `1. lhci 리포트(artifact) 다운로드해서 어느 audit 이 실패했는지 확인`,
    `2. SEO 회귀 원인 파악 (meta 변경, robots.txt, sitemap.xml, JSON-LD 변경 등)`,
    `3. 고친 후 main 에 다시 push → 본 워크플로 재실행 → 본 issue close`,
    ``,
    `_Auto-created by .github/workflows/seo-production-monitor.yml — 본 issue 는 같은 날 중복 생성되지 않습니다._`
  ].join('\n'),
  labels: ['seo', 'regression', 'auto'],
});
```

### 4.3 Edge case 처리

| 상황 | 동작 |
|------|------|
| 같은 날 두 번 fail | sticky title 으로 중복 방지, 이전 issue 에 코멘트 추가하지 않음 (단순화) |
| 다음 날 또 fail | 새 issue 생성 (날짜 prefix 다름) — 이전 issue 가 close 안 됐으면 두 개 공존 가능 |
| `issues: write` 권한 누락 | step fail 로 가시화 (조용한 실패 방지) |
| bridgelogis.com 일시 다운 | Lighthouse 가 ERRORED_DOCUMENT_REQUEST → SEO score 측정 자체 실패 → assertion 도 fail → issue 자동 생성됨 (false positive 가능) |
| Vercel rate limit | 9 runs 정도는 normal 범위, 발생 시 numberOfRuns 1 로 축소 |

---

## 5. Failure & Recovery Scenarios

### 5.1 시나리오 A — main 에 SEO 회귀 commit 머지

1. push 트리거 → wait 90s → curl 폴링 → live 확인
2. lighthouse 9 runs 실행 → assertion fail (예: 0.85)
3. issue 자동 생성 (label `seo,regression,auto`)
4. 개발자가 회귀 원인 fix → 새 commit push
5. push 트리거 재실행 → assertion pass → 신규 issue 생성 안 함 (수동으로 close 필요)

### 5.2 시나리오 B — bridgelogis.com 다운

1. push 트리거 → wait 90s → curl 폴링 5분 timeout → warning 표시 후 진행
2. lighthouse → ERRORED_DOCUMENT_REQUEST → assertion fail
3. issue 생성 (false positive)

→ **완화**: issue 본문에 "production live 여부 확인" 안내 포함. step 3 의 warning 도 본문에 노출.

### 5.3 시나리오 C — 주간 cron 실행 중 production 변경 없음

1. cron 트리거 → wait step 스킵 (push 가 아님)
2. lighthouse → assertion pass → artifact 만 업로드
3. drift baseline 으로 활용 (lhci storage 7일 보관 + artifact 90일)

---

## 6. Test Plan

### 6.1 사전 검증 (구현 전)

- [ ] `lighthouserc.production.json` JSON 유효성
- [ ] workflow YAML 문법 (`actionlint` 또는 GitHub UI 미리보기)

### 6.2 구현 후 검증 (Do 단계)

- [ ] PR 에 신규 워크플로/config 추가 → ci.yml `check` job (lint/tsc/vitest) PASS
- [ ] PR 머지 후 main push → seo-production-monitor 워크플로 자동 실행 확인
- [ ] 실행 후 SEO score 출력 확인 (artifact + lhci public link)
- [ ] (회귀 시뮬레이션) `lighthouserc.production.json` 의 SEO 임계값을 1.0 으로 임시 변경 → 다시 push → fail → issue 자동 생성 확인 → 임계값 0.90 으로 원복
- [ ] cron schedule 다음 실행 시각 표시 확인 (Actions UI 의 "Scheduled" 표시)
- [ ] manual `workflow_dispatch` 트리거 → 정상 실행
- [ ] (idempotency) 같은 날 두 번 fail 시 issue 1개만 생성 확인

### 6.3 정상 운영 검증 (1주차)

- [ ] 주간 cron 자동 실행 확인 (월요일 02:00 KST)
- [ ] 정상 시 issue 생성 안 됨 확인
- [ ] artifact 다운로드 가능 확인

---

## 7. Rollout Strategy

### 7.1 단일 PR

scope 가 작으므로 단일 PR (`feat(ci): production SEO monitor workflow`).

### 7.2 단계

1. **Phase 1 (본 PR)**: 워크플로 + config 추가, SEO error 강제, push + weekly cron + manual 모두 활성화
2. **Phase 2 (후속, 본 사이클 외)**: Slack 알림 통합 (옵션 4.2-B)
3. **Phase 3 (a11y 사이클)**: color-contrast 등 audit-level rule 활성화 후 본 워크플로의 `categories:accessibility` 임계값 재검토

### 7.3 Rollback

- 워크플로 disable: GitHub UI → Actions → 본 워크플로 → "Disable workflow"
- 임계값 완화: `lighthouserc.production.json` `categories:seo` 를 `warn` 으로 임시 변경
- 완전 제거: 두 파일 git rm + main push

---

## 8. 위험 요소 (재검토)

| 위험 | 영향 | 완화 |
|------|:----:|------|
| Vercel rate limiting (9 runs/실행) | 낮 | numberOfRuns 1 로 축소 가능. 주간 cron 1회 + push trigger 동시 발생률 낮음 |
| bridgelogis.com 일시 다운 | 중 | wait step 90s + 폴링 5분, 실패 시 warning + 진행 (false positive 가능성 인지) |
| GitHub Actions 분당 minute 한도 | 낮 | 본 워크플로 1회 ~5분, 주간/이벤트 빈도 낮아 free tier 충분 |
| lhci public link 만료 | 낮 | uploadArtifacts: true 로 GitHub artifact 90일 보관 |
| Sticky title 중복 방지의 완전성 | 중 | 같은 날 중복 방지만 보장. 다음 날에 같은 회귀 → 새 issue (장점: 가시성) |
| Vercel 의 production deploy 실패 | 낮 | 본 워크플로는 trigger 만 사용 — Vercel deploy 실패는 별도로 가시화됨 |
| `issues: write` permission 회귀 | 높 | 본 PR review 시점에 명시적 검증, 변경 시 PR 차단 룰 적용 권장 |

---

## 9. Open Questions

- ❓ production CSP 가 lhci 의 외부 storage 업로드(temporaryPublicStorage) 차단할 가능성 → 첫 실행에서 확인 후 결정
- ❓ Vercel auto-deploy 가 90s 안에 ready 안 되는 케이스 빈도 → 1주 운영 후 sleep/timeout 조정
- ❓ accessibility 0.90 error 게이트가 production 에서 통과하는지 (color-contrast 회귀 가능성) → 첫 실행에서 확인 후 a11y 사이클 우선순위 조정

---

**작성**: 2026-05-05
**다음 단계**: `/pdca do production-seo-schedule` 로 구현 진입 (의 implementation order: lighthouserc.production.json → workflow YAML → 로컬 actionlint → PR)

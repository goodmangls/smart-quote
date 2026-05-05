# Design Spec: `fsc-sync` — 두 프로젝트 FSC 동기화 도구

- **Date**: 2026-05-04
- **Author**: jaehong
- **Status**: Approved (brainstorming 완료, implementation 대기)
- **Related projects**: `smart-quote-main`, `smart-quote-emax`
- **Tool location (예정)**: `~/Developer/Tools/fsc-sync/`

---

## 1. 배경 (Why)

매주 월요일 UPS/DHL/FedEx FSC% 업데이트 시 두 프로젝트(smart-quote-main, smart-quote-emax) 합쳐 **5-8개 파일을 손으로 수정**해야 한다. 현재 발생하는 비용:

- **누락/오타 위험** — 같은 값을 5곳에 중복 기재 (frontend rates.ts × 2, backend rates.rb × 2, fsc-history.ts × 2)
- **두 프로젝트 동시 수정 부담** — 디렉토리 이동, 두 번 commit/push
- **두 프로젝트 간 값 불일치 위험** — UPS/DHL은 양쪽이 같은 값을 써야 하는데 시간차로 어긋날 수 있음
- **공식 사이트 일일이 보러 가는 시간**

이 도구는 **매주 한 명령**으로 양쪽 프로젝트의 모든 FSC 관련 파일을 동기화하고, 검토 후 자동 commit + push까지 진행한다.

## 2. 핵심 결정사항 요약

| 항목 | 결정 |
|------|------|
| 도구 위치 | `~/Developer/Tools/fsc-sync/` (단일 사용자, 로컬 도구) |
| 런타임 | Bun (TypeScript), 단일 binary 컴파일 |
| 입력 방식 | **하이브리드** — CLI args + 빠진 값 prompts fallback |
| 자동화 범위 | **Confirm 게이트 + `--yes` 우회** — diff 보여주고 동의하면 commit + push까지 |
| Carrier 적용 | main → UPS/DHL · emax → UPS/DHL/FedEx/OCS (config의 carrier 화이트리스트) |
| OCS 처리 | 미입력 시 skip (값 변경 없음) — 거의 변동 없는 값 |
| Confirm 형식 | "양쪽 프로젝트 commit & push? [Y/n]" |
| Dry-run | `--dry-run` 옵션 — 변경 미리보기만 |
| CLAUDE.md 처리 | **별도 작업** — 도구 만든 후 첫 PR로 CLAUDE.md에서 동적 FSC 값 제거 (SSOT 확립). 도구는 rates.ts/rb/fsc-history.ts만 다룸 |
| 출력 언어 | 한국어/영어 혼용 |
| Ruby 소수점 | **두자리 통일** (`47.25`, `47.00`) |
| Rollback | 부분 — 실패한 단계만 `git checkout -- .`로 원복. 이미 commit된 이전 단계는 유지 |

## 3. Architecture

### 3.1 디렉토리 구조

```
~/Developer/Tools/fsc-sync/
├── package.json              # bun + commander, prompts, kleur
├── tsconfig.json
├── bin/
│   └── fsc-sync.ts           # CLI 엔트리포인트 (#!/usr/bin/env bun)
├── src/
│   ├── cli.ts                # arg parsing + interactive prompts
│   ├── config.ts             # PROJECTS 배열 (path, carriers, files)
│   ├── modifiers/
│   │   ├── ratesTs.ts        # src/config/rates.ts 수정
│   │   ├── ratesRb.ts        # smart-quote-api/lib/constants/rates.rb 수정
│   │   ├── fscHistory.ts     # src/config/fsc-history.ts 배열에 entry 추가
│   │   └── commitMessage.ts  # .commit_message.txt 자동 작성
│   ├── git.ts                # subprocess git add/commit/push
│   ├── differ.ts             # 변경분 diff 출력 (kleur 색상)
│   └── types.ts              # FscRates, ProjectConfig 등
├── tests/
│   ├── modifiers.test.ts     # 정규식 단위 테스트
│   ├── config.test.ts
│   └── fixtures/             # 샘플 rates.ts/rb 파일
├── README.md
└── install.sh                # bun install + bun build --compile + ~/.local/bin/fsc-sync 복사
```

### 3.2 핵심 타입

```typescript
// src/types.ts
type Carrier = 'ups' | 'dhl' | 'fedex' | 'ocs';

type FscRates = Partial<Record<Carrier, number>>;  // partial — 미입력은 skip

interface ProjectConfig {
  name: 'main' | 'emax';
  path: string;                     // 절대 경로
  carriers: Carrier[];              // 적용 화이트리스트
  files: {
    ratesTs: string;                // 'src/config/rates.ts'
    ratesRb: string;                // 'smart-quote-api/lib/constants/rates.rb'
    fscHistory: string;             // 'src/config/fsc-history.ts'
  };
}

interface FileChange {
  project: string;
  filePath: string;                 // 절대 경로
  carrier: Carrier;
  oldValue: number;
  newValue: number;
  description: string;              // diff 출력용
}

interface ChangePlan {
  projects: ProjectChangePlan[];
  effectiveDate: string;
}

interface ProjectChangePlan {
  project: ProjectConfig;
  changes: FileChange[];
  commitMessage: string;
}
```

### 3.3 PROJECTS config (hard-coded)

```typescript
// src/config.ts
export const PROJECTS: ProjectConfig[] = [
  {
    name: 'main',
    path: '/Users/jaehong/Developer/Projects/smart-quote-main',
    carriers: ['ups', 'dhl'],
    files: {
      ratesTs: 'src/config/rates.ts',
      ratesRb: 'smart-quote-api/lib/constants/rates.rb',
      fscHistory: 'src/config/fsc-history.ts',
    },
  },
  {
    name: 'emax',
    path: '/Users/jaehong/Developer/Projects/smart-quote-emax',
    carriers: ['ups', 'dhl', 'fedex', 'ocs'],
    files: {
      ratesTs: 'src/config/rates.ts',
      ratesRb: 'smart-quote-api/lib/constants/rates.rb',
      fscHistory: 'src/config/fsc-history.ts',
    },
  },
];
```

### 3.4 의존성

```json
{
  "dependencies": {
    "commander": "^12.0.0",
    "prompts": "^2.4.2",
    "kleur": "^4.1.5"
  },
  "devDependencies": {
    "@types/prompts": "^2.4.9",
    "@types/bun": "latest"
  }
}
```

## 4. CLI Interface

### 4.1 사용 모드 3가지

#### Mode 1 — 빠른 모드 (args 모두 제공)

```bash
$ fsc-sync --ups 47.25 --dhl 47.00 --fedex 45.25

📊 적용 대상:
  ✓ main:  UPS 45.50 → 47.25 ↑+1.75 | DHL 48.00 → 47.00 ↓-1.00
  ✓ emax:  UPS 45.50 → 47.25 ↑+1.75 | DHL 48.00 → 47.00 ↓-1.00
                FedEx 43.50 → 45.25 ↑+1.75 | OCS 10.00 (skip, 미입력)
  📅 effective date: 2026-05-04 (오늘)

📝 변경될 파일 (총 8개):
  main/src/config/rates.ts                    (UPS, DHL)
  main/smart-quote-api/lib/constants/rates.rb (UPS, DHL)
  main/src/config/fsc-history.ts              (UPS+DHL entry 추가)
  main/.commit_message.txt                    (auto-generated)
  emax/src/config/rates.ts                    (UPS, DHL, FedEx)
  emax/smart-quote-api/lib/constants/rates.rb (UPS, DHL, FedEx)
  emax/src/config/fsc-history.ts              (UPS+DHL+FedEx entry 추가)
  emax/.commit_message.txt                    (auto-generated)

? 양쪽 프로젝트 commit & push? (Vercel + Render 4개 빌드 트리거됨) [Y/n] _
```

#### Mode 2 — 하이브리드 모드 (args 일부만 제공)

```bash
$ fsc-sync --ups 47.25
? DHL FSC% (현재값 48.00): 47.00 ⏎
? FedEx FSC% (emax만 적용, 현재값 43.50): 45.25 ⏎
? OCS FSC% (emax만 적용, 현재값 10.00, Enter=skip): ⏎  # skip
? Effective date (YYYY-MM-DD, 기본=오늘): ⏎
... (이후 빠른 모드와 동일)
```

#### Mode 3 — 드라이런 (파일/git 변경 없음)

```bash
$ fsc-sync --ups 47.25 --dhl 47.00 --fedex 45.25 --dry-run

📋 [DRY RUN] 변경 미리보기 (실제 수정 안 함)
... (diff만 출력 후 종료)
```

### 4.2 옵션 reference

```
fsc-sync [options]

값 입력:
  --ups <pct>          UPS FSC% (예: 47.25)
  --dhl <pct>          DHL FSC%
  --fedex <pct>        FedEx FSC% (emax만 적용)
  --ocs <pct>          OCS FSC% (emax만 적용, 보통 생략)
  --date <YYYY-MM-DD>  effective date (기본: 오늘)

대상 제어:
  --only <name>        한 프로젝트만 (main | emax). 기본은 양쪽 모두
  --no-history         fsc-history.ts entry 추가 안 함
  --force              fsc-history 동일 date entry 덮어쓰기 (안전망 우회)

자동화 제어:
  --dry-run            파일 변경/commit 안 함, 미리보기만
  --yes, -y            confirm prompt 생략, 끝까지 자동
  --no-push            commit만, push 생략

기타:
  --verbose, -v        상세 로그
  --help, -h           도움말
  --version            버전
```

### 4.3 종료 코드

| 코드 | 의미 |
|------|------|
| 0 | 성공 (또는 dry-run 정상 종료, confirm `n` 입력) |
| 1 | 사용자 input 오류 (값 누락, 잘못된 format) |
| 2 | 파일 수정 실패 (정규식 미스매치 등) |
| 3 | git 작업 실패 (commit/push) |
| 130 | Ctrl+C |

## 5. Execution Flow

```
1. CLI args 파싱 (commander)
   └─ 빠진 값은 prompts로 채우기 (--yes 면 빠진 값 그대로 skip)

2. Validation
   ├─ 값 범위: 0 ≤ pct ≤ 100
   ├─ date 형식: YYYY-MM-DD, 오늘 ~ 7일 이내 (오타 방지)
   └─ 적어도 1개 carrier 입력 (전부 빈 값이면 abort)

3. Plan 생성 (각 프로젝트 × 각 carrier matrix)
   ├─ 프로젝트별 적용 carrier subset 계산
   ├─ 현재값 읽기 (정규식 read-only)
   └─ 변경분 계산: { project, file, oldValue, newValue, diff }

4. Diff 출력 (kleur 색상)
   └─ "📊 적용 대상" + "📝 변경될 파일" 표시

5. Confirm prompt ("[Y/n]") — --yes 시 skip, --dry-run 시 종료

6. 파일 수정 (transactional within each project)
   ├─ project 1 (main): 모든 파일 수정 → 검증 → OK 시 다음
   └─ project 2 (emax): 동일

7. .commit_message.txt 자동 생성 (각 프로젝트)

8. git add + commit (각 프로젝트, 각각의 디렉토리에서)

9. git push (--no-push 시 skip)

10. 결과 요약 출력
    ├─ ✓ main: pushed (commit hash, Vercel/Render 빌드 트리거됨)
    └─ ✓ emax: pushed (commit hash)
```

## 6. File Modifiers

### 6.1 `src/config/rates.ts` (TypeScript)

**대상 패턴**:
```typescript
export const DEFAULT_FSC_PERCENT = 45.5; // UPS FSC, effective 2026-04-27
```

**정규식** (carrier별, 값 + comment의 date를 한 번에 처리):
```regex
UPS:   /(export const DEFAULT_FSC_PERCENT = )([\d.]+)(;\s*\/\/[^\n]*?effective )(\d{4}-\d{2}-\d{2})([^\n]*)/
DHL:   /(export const DEFAULT_FSC_PERCENT_DHL = )([\d.]+)(;\s*\/\/[^\n]*?effective )(\d{4}-\d{2}-\d{2})([^\n]*)/
FedEx: /(export const DEFAULT_FSC_PERCENT_FEDEX = )([\d.]+)(;\s*\/\/[^\n]*?effective )(\d{4}-\d{2}-\d{2})([^\n]*)/
OCS:   /(export const DEFAULT_FSC_PERCENT_OCS = )([\d.]+)(;\s*\/\/[^\n]*?effective )(\d{4}-\d{2}-\d{2})([^\n]*)/
```

**캡처 그룹 → 치환 매핑**:
| 그룹 | 내용 | 치환 |
|------|------|------|
| $1 | `export const ... = ` | 그대로 |
| $2 | 기존 값 (예: `45.5`) | 새 값 (TS는 trailing zero 정리: `47.25`, `47.0`) |
| $3 | `; // ... effective ` | 그대로 |
| $4 | 기존 date (예: `2026-04-27`) | 새 date (예: `2026-05-04`) |
| $5 | comment의 나머지 (예: `~05/03`) | **그대로** (사용자가 수동으로 적은 추가 메모 보존) |

**Edge case**: comment에 `effective` 없는 경우 (예: `// OCS default`) → date 갱신 skip, 값만 갱신. 별도 정규식 alternative 필요:
```regex
값만:  /(export const DEFAULT_FSC_PERCENT_OCS = )([\d.]+)(;)/
```
구현 시 두 정규식 try → effective 매칭 실패 시 값만 갱신.

### 6.2 `smart-quote-api/lib/constants/rates.rb` (Ruby)

**대상 패턴**:
```ruby
DEFAULT_FSC_PERCENT = 45.50 # UPS FSC, effective 2026-04-27
```

**정규식**: TypeScript와 거의 동일, Ruby 문법 차이 (`=` 양쪽 공백, semicolon 없음)

**소수점 형식**: **두자리 통일** (`47.25`, `47.00`)

### 6.3 `src/config/fsc-history.ts` (entry 추가)

**전략**: AST 파싱 대신 **2-step 정규식** — (1) carrier 배열 블록 찾기 (2) 마지막 entry 뒤에 삽입

**Step 1 — carrier 블록 추출** (carrier별):
```regex
ups:   /(\bups: \[\n)([\s\S]*?)(\n  \],)/
dhl:   /(\bdhl: \[\n)([\s\S]*?)(\n  \],)/
fedex: /(\bfedex: \[\n)([\s\S]*?)(\n  \],)/
```

`$2`는 배열 내부 (모든 entry 포함). main 프로젝트는 fedex/ocs 배열이 없어 매칭 실패 시 자동 skip.

**Step 2 — 중복 date 검사**:
```regex
중복 검사: /\{ date: '${escapedDate}', rate: [\d.]+ \},/
```
`$2` 내부에서 매칭되면 → `--force` 없이는 abort.

**Step 3 — 새 entry 삽입**:
```typescript
const newEntry = `    { date: '${date}', rate: ${rate} },`;
const replaced = original.replace(blockRegex, `$1$2\n${newEntry}$3`);
```

**Before**:
```typescript
  ups: [
    { date: '2026-04-20', rate: 47.5 },
    { date: '2026-04-27', rate: 45.5 },
  ],
```

**After**:
```typescript
  ups: [
    { date: '2026-04-20', rate: 47.5 },
    { date: '2026-04-27', rate: 45.5 },
    { date: '2026-05-04', rate: 47.25 },
  ],
```

**들여쓰기**: 기존 entry의 들여쓰기 (4 spaces)를 따름. 이는 emax fsc-history.ts의 현재 형식이며 main에도 동일.

**중복 date entry 처리**: 동일 date entry 이미 존재 시 → **error abort + 안내** ("이미 2026-05-04 entry 있음. 다시 실행하시겠다면 --force"). `--force` 시 기존 entry를 새 값으로 교체 (라인 단위 replace).

**main에는 `fedex`/`ocs` 배열이 없음** → carrier 화이트리스트로 자동 skip (config 단계에서 결정, 정규식까지 도달 안 함). 만약 도달해도 Step 1 매칭 실패 시 graceful warning 후 skip.

### 6.4 `.commit_message.txt` (auto-generated)

**main 예시**:
```
⛽ chore(fsc): 2026-05-04 FSC 업데이트 — UPS 45.50→47.25%, DHL 48.00→47.00% (frontend+backend+history 동시)
```

**emax 예시** (carrier 적용 범위에 따라 자동 조정):
```
⛽ chore(fsc): 2026-05-04 FSC 업데이트 — UPS 45.50→47.25%, DHL 48.00→47.00%, FedEx 43.50→45.25% (OCS 동일, frontend+backend+history 동시)
```

**규칙**:
- **카테고리 1 — 변경된 carrier**: 본문에 `UPS 45.50→47.25%` 형식으로 나열
- **카테고리 2 — 프로젝트 carrier set에 있지만 값 미입력 (skip)**: 끝에 "(OCS 동일)" 형식으로 추가
- **카테고리 3 — 프로젝트 carrier set에 없는 carrier**: commit message에 **언급 없음** (예: main에서는 FedEx/OCS 자체 언급 안 함)
- 변경 화살표: `이전→이후` 형식 (소수점 두자리)
- 효력일 prefix: `YYYY-MM-DD FSC 업데이트`
- 끝 suffix: `(... frontend+backend+history 동시)` (history 미갱신 시 `(... frontend+backend 동시)`)

**예시 매트릭스**:

| 시나리오 | main 메시지 | emax 메시지 |
|---------|-------------|-------------|
| UPS, DHL, FedEx 모두 변경 (OCS 미입력) | `... UPS 45.50→47.25%, DHL 48.00→47.00% (...)` | `... UPS 45.50→47.25%, DHL 48.00→47.00%, FedEx 43.50→45.25% (OCS 동일, ...)` |
| UPS만 변경 | `... UPS 45.50→47.25% (DHL 동일, ...)` | `... UPS 45.50→47.25% (DHL/FedEx/OCS 동일, ...)` |
| `--no-history` 사용 | `(frontend+backend 동시)` | `(frontend+backend 동시)` |

## 7. Error Handling

| 시나리오 | 동작 | 종료 코드 |
|---------|------|:--------:|
| 정규식 미스매치 (rates.ts 형식 변경됨) — Plan 단계 (Step 3) | 즉시 abort, 변경된 파일 0개. 사용자에 "수동 확인 필요" 안내 | 2 |
| 동일 date entry 이미 존재 (Step 3) | abort + "--force로 덮어쓰기 가능" 안내 | 1 |
| **Project 1 파일 수정 실패** (Step 6) | project 1 변경분 `git checkout -- .` 원복. project 2 시작 안 함 | 2 |
| **Project 2 파일 수정 실패** (Step 6) | project 1은 **수정만 됐고 commit 안 됨** → `git checkout -- .` 로 원복. project 2도 원복. 양쪽 깨끗한 상태로 종료 | 2 |
| **Project 1 commit 실패** (Step 8, pre-commit hook 등) | project 1 변경분 `git checkout -- .` 원복. project 2 시작 안 함 | 3 |
| **Project 2 commit 실패** (Step 8) | project 1은 **이미 commit됨 (push 전)** → 그대로 유지. project 2 변경분 `git checkout -- .` 원복. 사용자에 "project 1 commit은 살아있음, project 2 수동 처리 필요" 명확히 안내 | 3 |
| **Project 1 push 실패** (Step 9, 네트워크 등) | project 2 push 시도 안 함. 양쪽 commit 살아있음. "수동 push 필요" 안내 | 3 |
| **Project 2 push 실패** (Step 9) | project 1 push는 이미 성공. project 2 commit 살아있음. "project 2 수동 push 필요" 안내 | 3 |
| 사용자 Ctrl+C | 진행 중 단계 cleanup 시도 (수정만 된 상태면 git checkout 원복) | 130 |
| 값 범위 초과 (예: --ups 200) | abort, validation error | 1 |
| date 형식 오류 | abort, validation error | 1 |
| --only 알 수 없는 프로젝트명 | abort, "main 또는 emax만 가능" | 1 |

**핵심 원칙**:
- **Step 6 (파일 수정) 실패 시**: 양쪽 모두 원복 (atomic 시도). project 2 실패 시 project 1도 원복 가능 (아직 commit 전).
- **Step 8 (commit) 이후 실패 시**: 부분 rollback. 이전 단계의 commit은 보존하되 명확히 안내.
- **rollback은 `git checkout -- .` 만 사용** (untracked 파일은 손대지 않음, 안전).

## 8. Testing Strategy

### 8.1 Unit tests (`tests/modifiers.test.ts`)

```typescript
test('updates UPS FSC in rates.ts preserving comment', () => {
  const input = `export const DEFAULT_FSC_PERCENT = 45.5; // UPS FSC, effective 2026-04-27`;
  const expected = `export const DEFAULT_FSC_PERCENT = 47.25; // UPS FSC, effective 2026-05-04`;
  expect(updateRatesTs(input, 'ups', 47.25, '2026-05-04')).toBe(expected);
});

test('refuses to add duplicate date entry to fsc-history', () => {
  expect(() => addHistoryEntry(input, 'ups', 47.25, '2026-05-04')).toThrow(/already exists/);
});

test('skips fedex when project carriers does not include fedex', () => {
  // 구체 구현은 implementation 단계에서 결정 — 이 테스트는 PROJECTS config의
  // carriers 화이트리스트가 main에서 fedex를 제외시키는지 검증
});

test('Ruby float two-decimal normalization', () => {
  // input = "DEFAULT_FSC_PERCENT_DHL = 48.0 # ..."
  // 입력값 47.0 → 출력에서 "47.00" (두자리)
  const input = `DEFAULT_FSC_PERCENT_DHL = 48.0 # DHL FSC, effective 2026-04-27`;
  const result = updateRatesRb(input, 'dhl', 47.0, '2026-05-04');
  expect(result).toContain('47.00');
  expect(result).not.toContain('47.0 ');  // 한자리 형식 제거됨
});
```

### 8.2 Integration tests

임시 디렉토리에 sample rates.ts/rb 생성 → 도구 함수 직접 호출 → 결과 파일 검증

### 8.3 Manual smoke test (사용자 권장)

```bash
fsc-sync --dry-run --ups 47.25 --dhl 47.00 --fedex 45.25
# 출력 확인 → 실제 실행 안전성 검증
```

## 9. Install

`install.sh`:

```bash
#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

# 1. 의존성 설치
bun install

# 2. 단일 binary 컴파일
mkdir -p ~/.local/bin
bun build bin/fsc-sync.ts --compile --outfile ~/.local/bin/fsc-sync

# 3. PATH 안내
if ! echo "$PATH" | grep -q "$HOME/.local/bin"; then
  echo "⚠️  ~/.local/bin이 PATH에 없습니다. ~/.zshrc에 다음 추가:"
  echo '    export PATH="$HOME/.local/bin:$PATH"'
fi

# 4. 검증
~/.local/bin/fsc-sync --version
echo "✓ Installed. 'fsc-sync --help' 로 시작하세요."
```

## 10. Out of Scope (v1) / Future Extensions

- ❌ **외부 자동 fetch** (UPS/DHL/FedEx 사이트 스크레이핑) — fragile, v2 후보
- ❌ **GitHub Action / cron 자동 실행** — 사람 개입 최소화는 별도 PDCA
- ❌ **팀 공유 / Slack bot** — 단일 사용자 도구로 출발
- ❌ **CLAUDE.md 자동 갱신** — SSOT 원칙으로 별도 작업
- ❌ **다른 프로젝트 (ASCA, LogiNexus 등) 추가** — config에 한 줄 추가하면 가능하나 현재 scope 외

## 11. CLAUDE.md 정리 작업 (선행 작업, 별도 PR)

도구 만들기 전(또는 후) 두 프로젝트 CLAUDE.md에서 동적 FSC 값 제거:

**main**:
- 라인 61 (codebase 본문 설명에서 값 제거)
- 라인 318 (Market defaults 섹션 → "현재값은 src/config/rates.ts 참조" 로 단순화)

**emax**:
- 라인 65-66 (codebase 본문 설명)
- 라인 341 (Market defaults 섹션)

**예시 변경 (main 라인 318)**:
```diff
- **Market defaults**: `DEFAULT_EXCHANGE_RATE=1450` (하나은행 월요일 09시 송금환율), `DEFAULT_FSC_PERCENT=45.50` (UPS 2026-04-27), `DEFAULT_FSC_PERCENT_DHL=48.00` (DHL 2026-04-27) in `src/config/rates.ts`
+ **Market defaults**: 환율/FSC 현재값은 `src/config/rates.ts` 참조. 업데이트 주기: 환율 매주 월요일(하나은행), UPS/DHL FSC 매주 월요일.
```

## 12. Success Criteria

이 도구는 다음을 만족하면 성공:

- [ ] **45초 이내**에 두 프로젝트 FSC 업데이트 + commit + push 완료 (사용자 확인 1회 포함)
- [ ] **누락 0건** — main의 UPS/DHL과 emax의 UPS/DHL은 항상 동일 값
- [ ] **dry-run으로 안전 검증 가능** — 실수 invocation도 파일/git 변경 없이 종료
- [ ] **정규식 미스매치 시 graceful abort** — 손상된 파일 남기지 않음
- [ ] **Test coverage 80%+** — 정규식, validation, history 추가 모두 단위 테스트
- [ ] **첫 실행 후 두 번째 주부터는 매주 1줄 명령으로 운영**

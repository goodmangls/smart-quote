# fsc-sync Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 매주 한 명령으로 smart-quote-main과 smart-quote-emax 두 프로젝트의 FSC 값(UPS/DHL/FedEx/OCS)을 동기화하고 commit+push까지 처리하는 Bun TypeScript CLI 구축.

**Architecture:** Bun TypeScript single-binary CLI. Modifier-per-file 패턴 (각 파일 형식별 정규식 기반 수정 모듈). PROJECTS config-driven (각 프로젝트의 path/carrier 화이트리스트/file 경로 정의). 하이브리드 입력 UX (CLI args + 빠진 값 prompts fallback). Confirm 게이트 + Step별 atomic-where-possible rollback.

**Tech Stack:** Bun 1.x, TypeScript 5.x, commander ^12, prompts ^2.4, kleur ^4.1, bun:test (built-in).

**Spec reference:** [docs/superpowers/specs/2026-05-04-fsc-sync-tool-design.md](../specs/2026-05-04-fsc-sync-tool-design.md) (commit d27117a)

**Implementation location:** `~/Developer/Tools/fsc-sync/` (별도 디렉토리, 두 프로젝트와 독립)

---

## File Structure

각 파일의 책임을 미리 명확히 합니다.

| 파일 | 책임 |
|------|------|
| `package.json` | 의존성 정의, npm scripts (test, build) |
| `tsconfig.json` | TypeScript 설정 (strict, ESNext target) |
| `bin/fsc-sync.ts` | Shebang 엔트리, src/cli.ts의 `main()` 호출 |
| `src/types.ts` | Carrier, FscRates, ProjectConfig, FileChange, ChangePlan, ProjectChangePlan 타입 정의 |
| `src/config.ts` | PROJECTS 배열 (main, emax 정의) |
| `src/modifiers/ratesTs.ts` | rates.ts 정규식 수정 (TypeScript 형식) |
| `src/modifiers/ratesRb.ts` | rates.rb 정규식 수정 (Ruby 형식, 두자리 통일) |
| `src/modifiers/fscHistory.ts` | fsc-history.ts 배열 entry 추가 (중복 검사 + --force) |
| `src/modifiers/commitMessage.ts` | .commit_message.txt 자동 생성 (carrier 매트릭스) |
| `src/differ.ts` | 변경 plan을 사용자 친화 diff로 출력 (kleur 색상) |
| `src/git.ts` | subprocess git add/commit/push (Bun.spawn 사용) |
| `src/cli.ts` | commander + prompts orchestrator, 10단계 execution flow, error handling |
| `tests/fixtures/sample-rates.ts` | 테스트용 샘플 (실제 코드 형식 모방) |
| `tests/fixtures/sample-rates.rb` | 동일 |
| `tests/fixtures/sample-fsc-history.ts` | 동일 |
| `tests/modifiers/ratesTs.test.ts` | ratesTs.ts unit tests |
| `tests/modifiers/ratesRb.test.ts` | ratesRb.ts unit tests |
| `tests/modifiers/fscHistory.test.ts` | fscHistory.ts unit tests |
| `tests/modifiers/commitMessage.test.ts` | commitMessage.ts unit tests |
| `tests/config.test.ts` | PROJECTS sanity check |
| `install.sh` | bun install + bun build --compile + ~/.local/bin 복사 |
| `README.md` | 사용법, install, troubleshooting |
| `.gitignore` | node_modules, dist, *.log |

---

## Task 0: Project bootstrap

**Files:**
- Create: `~/Developer/Tools/fsc-sync/package.json`
- Create: `~/Developer/Tools/fsc-sync/tsconfig.json`
- Create: `~/Developer/Tools/fsc-sync/.gitignore`
- Create: `~/Developer/Tools/fsc-sync/bin/`, `src/modifiers/`, `tests/modifiers/`, `tests/fixtures/` (디렉토리)

- [ ] **Step 1: 디렉토리 생성 및 git init**

```bash
mkdir -p ~/Developer/Tools/fsc-sync
cd ~/Developer/Tools/fsc-sync
mkdir -p bin src/modifiers tests/modifiers tests/fixtures
git init
```

- [ ] **Step 2: package.json 작성**

`~/Developer/Tools/fsc-sync/package.json`:

```json
{
  "name": "fsc-sync",
  "version": "1.0.0",
  "description": "Sync weekly FSC rates across smart-quote-main and smart-quote-emax",
  "type": "module",
  "bin": {
    "fsc-sync": "./bin/fsc-sync.ts"
  },
  "scripts": {
    "test": "bun test",
    "build": "bun build bin/fsc-sync.ts --compile --outfile dist/fsc-sync"
  },
  "dependencies": {
    "commander": "^12.0.0",
    "prompts": "^2.4.2",
    "kleur": "^4.1.5"
  },
  "devDependencies": {
    "@types/prompts": "^2.4.9",
    "@types/bun": "latest",
    "typescript": "^5.5.0"
  }
}
```

- [ ] **Step 3: tsconfig.json 작성**

`~/Developer/Tools/fsc-sync/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "lib": ["ESNext"],
    "types": ["bun-types"],
    "noEmit": true
  },
  "include": ["src/**/*", "bin/**/*", "tests/**/*"]
}
```

- [ ] **Step 4: .gitignore 작성**

`~/Developer/Tools/fsc-sync/.gitignore`:

```
node_modules/
dist/
*.log
.DS_Store
bun.lockb
```

- [ ] **Step 5: 의존성 설치 및 검증**

```bash
cd ~/Developer/Tools/fsc-sync
bun install
bun --version  # 1.x 확인
ls node_modules/commander node_modules/prompts node_modules/kleur  # 설치 확인
```

Expected: 3개 디렉토리 모두 표시, 에러 없음

- [ ] **Step 6: 첫 commit**

```bash
cd ~/Developer/Tools/fsc-sync
git add package.json tsconfig.json .gitignore
git commit -m "chore: bootstrap fsc-sync project (Bun + TS + commander/prompts/kleur)"
```

---

## Task 1: Core types

**Files:**
- Create: `~/Developer/Tools/fsc-sync/src/types.ts`

- [ ] **Step 1: src/types.ts 작성**

```typescript
// src/types.ts

/** 지원되는 carrier 식별자. spec 2.1 참고. */
export type Carrier = 'ups' | 'dhl' | 'fedex' | 'ocs';

/** 사용자 입력 FSC 값. 미입력 carrier는 키 없음 (skip 의미). */
export type FscRates = Partial<Record<Carrier, number>>;

/** 프로젝트별 정적 config (path, carrier set, file 경로). */
export interface ProjectConfig {
  name: 'main' | 'emax';
  path: string; // 절대 경로
  carriers: Carrier[]; // 적용 화이트리스트 (이 set에 없는 carrier는 무시)
  files: {
    ratesTs: string; // 프로젝트 path 기준 상대경로
    ratesRb: string;
    fscHistory: string;
  };
}

/** 단일 파일 내 단일 carrier의 변경 정보. */
export interface FileChange {
  project: string; // 'main' | 'emax'
  filePath: string; // 절대 경로
  fileType: 'ratesTs' | 'ratesRb' | 'fscHistory' | 'commitMessage';
  carrier: Carrier;
  oldValue: number | null; // null = 새 entry (fsc-history)
  newValue: number;
  description: string; // diff 출력용 한 줄 설명
}

/** 단일 프로젝트의 모든 변경 + 커밋 메시지. */
export interface ProjectChangePlan {
  project: ProjectConfig;
  changes: FileChange[];
  commitMessage: string;
  /** carriers in this project that user provided values for */
  appliedCarriers: Carrier[];
  /** carriers in this project that user did NOT provide (skip = keep current) */
  skippedCarriers: Carrier[];
}

/** 전체 실행 plan (모든 프로젝트). */
export interface ChangePlan {
  projects: ProjectChangePlan[];
  effectiveDate: string; // YYYY-MM-DD
  rates: FscRates; // 사용자 입력 원본
}

/** CLI 옵션 (commander 출력). */
export interface CliOptions {
  ups?: number;
  dhl?: number;
  fedex?: number;
  ocs?: number;
  date?: string;
  only?: 'main' | 'emax';
  noHistory?: boolean;
  force?: boolean;
  dryRun?: boolean;
  yes?: boolean;
  noPush?: boolean;
  verbose?: boolean;
}
```

- [ ] **Step 2: 타입 검증 (tsc 실행)**

```bash
cd ~/Developer/Tools/fsc-sync
bunx tsc --noEmit
```

Expected: 에러 없음 (no output)

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat(types): define core types (Carrier, ProjectConfig, FileChange, ChangePlan)"
```

---

## Task 2: PROJECTS config + sanity test

**Files:**
- Create: `~/Developer/Tools/fsc-sync/src/config.ts`
- Create: `~/Developer/Tools/fsc-sync/tests/config.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/config.test.ts`:

```typescript
import { test, expect, describe } from 'bun:test';
import { PROJECTS } from '../src/config';

describe('PROJECTS config', () => {
  test('main project has UPS and DHL carriers only', () => {
    const main = PROJECTS.find((p) => p.name === 'main');
    expect(main).toBeDefined();
    expect(main!.carriers).toEqual(['ups', 'dhl']);
  });

  test('emax project has UPS, DHL, FedEx, and OCS carriers', () => {
    const emax = PROJECTS.find((p) => p.name === 'emax');
    expect(emax).toBeDefined();
    expect(emax!.carriers).toEqual(['ups', 'dhl', 'fedex', 'ocs']);
  });

  test('both projects have absolute paths', () => {
    for (const p of PROJECTS) {
      expect(p.path.startsWith('/')).toBe(true);
    }
  });

  test('both projects have the same three file keys', () => {
    for (const p of PROJECTS) {
      expect(Object.keys(p.files).sort()).toEqual(['fscHistory', 'ratesRb', 'ratesTs']);
    }
  });
});
```

- [ ] **Step 2: 테스트 실행 (FAIL 확인)**

```bash
cd ~/Developer/Tools/fsc-sync
bun test tests/config.test.ts
```

Expected: FAIL with "Cannot find module '../src/config'"

- [ ] **Step 3: src/config.ts 구현**

`src/config.ts`:

```typescript
import type { ProjectConfig } from './types';

/** Hard-coded 프로젝트 정의. 새 PC 셋업 시 path만 수정. */
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

- [ ] **Step 4: 테스트 실행 (PASS 확인)**

```bash
bun test tests/config.test.ts
```

Expected: 4 pass, 0 fail

- [ ] **Step 5: Commit**

```bash
git add src/config.ts tests/config.test.ts
git commit -m "feat(config): define PROJECTS for main (UPS/DHL) and emax (UPS/DHL/FedEx/OCS)"
```

---

## Task 3: Modifier `ratesTs` (TDD, 4 sub-cycles)

**Files:**
- Create: `~/Developer/Tools/fsc-sync/tests/fixtures/sample-rates.ts`
- Create: `~/Developer/Tools/fsc-sync/tests/modifiers/ratesTs.test.ts`
- Create: `~/Developer/Tools/fsc-sync/src/modifiers/ratesTs.ts`

### Cycle 3.1 — Setup fixture + UPS update

- [ ] **Step 1: fixture 파일 작성**

`tests/fixtures/sample-rates.ts`:

```typescript
// This file mimics smart-quote-emax/src/config/rates.ts format.
// Used for unit testing the ratesTs modifier.
export const FUMIGATION_FEE = 30000;
export const PACKING_LABOR_UNIT_COST = 50000;
export const TRANSIT_TIMES = {
  UPS: '2-4 Business Days',
} as const;
export const DEFAULT_EXCHANGE_RATE = 1450;
export const DEFAULT_FSC_PERCENT = 45.5; // UPS default, effective 2026-04-27
export const DEFAULT_FSC_PERCENT_DHL = 48.0; // DHL default, effective 2026-04-27
export const DEFAULT_FSC_PERCENT_FEDEX = 43.5; // FedEx default, effective 2026-04-27
export const DEFAULT_FSC_PERCENT_OCS = 10.0; // OCS default
```

- [ ] **Step 2: 첫 번째 실패 테스트 (UPS update + date 갱신)**

`tests/modifiers/ratesTs.test.ts`:

```typescript
import { test, expect, describe } from 'bun:test';
import { readFileSync } from 'fs';
import { join } from 'path';
import { updateRatesTs } from '../../src/modifiers/ratesTs';

const FIXTURE_PATH = join(import.meta.dir, '../fixtures/sample-rates.ts');
const ORIGINAL = readFileSync(FIXTURE_PATH, 'utf-8');

describe('updateRatesTs', () => {
  test('updates UPS value and effective date, preserving comment text', () => {
    const result = updateRatesTs(ORIGINAL, 'ups', 47.25, '2026-05-04');
    expect(result).toContain(
      `export const DEFAULT_FSC_PERCENT = 47.25; // UPS default, effective 2026-05-04`,
    );
    // 다른 carrier 영향 없음
    expect(result).toContain(`DEFAULT_FSC_PERCENT_DHL = 48`);
  });
});
```

- [ ] **Step 3: 테스트 실행 (FAIL 확인)**

```bash
bun test tests/modifiers/ratesTs.test.ts
```

Expected: FAIL with "Cannot find module '../../src/modifiers/ratesTs'"

- [ ] **Step 4: 최소 구현 (UPS만)**

`src/modifiers/ratesTs.ts`:

```typescript
import type { Carrier } from '../types';

const VAR_NAME: Record<Carrier, string> = {
  ups: 'DEFAULT_FSC_PERCENT',
  dhl: 'DEFAULT_FSC_PERCENT_DHL',
  fedex: 'DEFAULT_FSC_PERCENT_FEDEX',
  ocs: 'DEFAULT_FSC_PERCENT_OCS',
};

/**
 * src/config/rates.ts 의 DEFAULT_FSC_PERCENT* 상수 값과 effective date를 갱신.
 *
 * 두 단계 정규식 (spec 6.1):
 *  1. effective 있는 경우: 값 + date 함께 갱신
 *  2. effective 없는 경우 (예: OCS): 값만 갱신
 *
 * comment의 추가 메모(예: "~05/03")는 그대로 보존.
 *
 * @throws Error 정규식 매칭 실패 시 (rates.ts 형식이 변경됨)
 */
export function updateRatesTs(
  content: string,
  carrier: Carrier,
  newValue: number,
  newDate: string,
): string {
  const varName = VAR_NAME[carrier];

  // Pattern 1: effective YYYY-MM-DD 있는 경우
  const withEffective = new RegExp(
    `(export const ${varName} = )([\\d.]+)(;\\s*//[^\\n]*?effective )(\\d{4}-\\d{2}-\\d{2})([^\\n]*)`,
  );
  if (withEffective.test(content)) {
    return content.replace(
      withEffective,
      (_, p1, _p2, p3, _p4, p5) => `${p1}${newValue}${p3}${newDate}${p5}`,
    );
  }

  // Pattern 2: effective 없는 경우 (값만 갱신)
  const valueOnly = new RegExp(`(export const ${varName} = )([\\d.]+)(;)`);
  if (valueOnly.test(content)) {
    return content.replace(valueOnly, (_, p1, _p2, p3) => `${p1}${newValue}${p3}`);
  }

  throw new Error(
    `[ratesTs] ${varName} 정규식 매칭 실패. rates.ts 형식이 변경되었거나 변수가 없습니다.`,
  );
}
```

- [ ] **Step 5: 테스트 실행 (PASS 확인)**

```bash
bun test tests/modifiers/ratesTs.test.ts
```

Expected: 1 pass, 0 fail

- [ ] **Step 6: Commit**

```bash
git add src/modifiers/ratesTs.ts tests/modifiers/ratesTs.test.ts tests/fixtures/sample-rates.ts
git commit -m "feat(modifiers): updateRatesTs UPS+date (TDD cycle 1/4)"
```

### Cycle 3.2 — DHL/FedEx/OCS coverage

- [ ] **Step 1: 추가 테스트 작성**

`tests/modifiers/ratesTs.test.ts` 에 추가:

```typescript
test('updates DHL value and date', () => {
  const result = updateRatesTs(ORIGINAL, 'dhl', 47.0, '2026-05-04');
  expect(result).toContain(
    `export const DEFAULT_FSC_PERCENT_DHL = 47; // DHL default, effective 2026-05-04`,
  );
});

test('updates FedEx value and date', () => {
  const result = updateRatesTs(ORIGINAL, 'fedex', 45.25, '2026-05-04');
  expect(result).toContain(
    `export const DEFAULT_FSC_PERCENT_FEDEX = 45.25; // FedEx default, effective 2026-05-04`,
  );
});

test('updates OCS value only (no effective date in comment)', () => {
  const result = updateRatesTs(ORIGINAL, 'ocs', 10.5, '2026-05-04');
  expect(result).toContain(`export const DEFAULT_FSC_PERCENT_OCS = 10.5; // OCS default`);
  // OCS comment에는 effective 없으므로 date는 무시되어야 함
  expect(result).not.toContain('effective 2026-05-04');
});
```

- [ ] **Step 2: 테스트 실행 (모두 PASS 예상 — 구현이 generic하므로)**

```bash
bun test tests/modifiers/ratesTs.test.ts
```

Expected: 4 pass, 0 fail

> Note: 만약 DHL/FedEx에서 fail 나면 정규식의 character class 문제. 구현 검토 후 수정.

- [ ] **Step 3: 정규식 미스매치 에러 테스트**

```typescript
test('throws when rates.ts format is unrecognized', () => {
  const broken = `export const FOO = 123;`;
  expect(() => updateRatesTs(broken, 'ups', 47.25, '2026-05-04')).toThrow(/매칭 실패/);
});
```

- [ ] **Step 4: 테스트 실행 (PASS 확인)**

```bash
bun test tests/modifiers/ratesTs.test.ts
```

Expected: 5 pass, 0 fail

- [ ] **Step 5: Commit**

```bash
git add tests/modifiers/ratesTs.test.ts
git commit -m "test(ratesTs): cover DHL/FedEx/OCS + missing-pattern error"
```

---

## Task 4: Modifier `ratesRb` (TDD, Ruby 두자리 통일)

**Files:**
- Create: `~/Developer/Tools/fsc-sync/tests/fixtures/sample-rates.rb`
- Create: `~/Developer/Tools/fsc-sync/tests/modifiers/ratesRb.test.ts`
- Create: `~/Developer/Tools/fsc-sync/src/modifiers/ratesRb.ts`

- [ ] **Step 1: fixture 작성**

`tests/fixtures/sample-rates.rb`:

```ruby
module Constants
  module Rates
    FUMIGATION_FEE = 30000
    DEFAULT_EXCHANGE_RATE = 1450
    DEFAULT_FSC_PERCENT = 45.50 # UPS default, effective 2026-04-27
    DEFAULT_FSC_PERCENT_DHL = 48.00 # DHL default, effective 2026-04-27
    DEFAULT_FSC_PERCENT_FEDEX = 43.50 # FedEx default, effective 2026-04-27
    DEFAULT_FSC_PERCENT_OCS = 10.00 # OCS default
  end
end
```

- [ ] **Step 2: 실패하는 테스트 작성**

`tests/modifiers/ratesRb.test.ts`:

```typescript
import { test, expect, describe } from 'bun:test';
import { readFileSync } from 'fs';
import { join } from 'path';
import { updateRatesRb } from '../../src/modifiers/ratesRb';

const FIXTURE_PATH = join(import.meta.dir, '../fixtures/sample-rates.rb');
const ORIGINAL = readFileSync(FIXTURE_PATH, 'utf-8');

describe('updateRatesRb', () => {
  test('updates UPS with two-decimal Ruby format', () => {
    const result = updateRatesRb(ORIGINAL, 'ups', 47.25, '2026-05-04');
    expect(result).toContain(
      `DEFAULT_FSC_PERCENT = 47.25 # UPS default, effective 2026-05-04`,
    );
  });

  test('normalizes single-decimal input to two decimals (47.0 → 47.00)', () => {
    const result = updateRatesRb(ORIGINAL, 'dhl', 47.0, '2026-05-04');
    expect(result).toContain(`DEFAULT_FSC_PERCENT_DHL = 47.00`);
  });

  test('updates OCS value only (no effective in comment)', () => {
    const result = updateRatesRb(ORIGINAL, 'ocs', 10.5, '2026-05-04');
    expect(result).toContain(`DEFAULT_FSC_PERCENT_OCS = 10.50 # OCS default`);
    expect(result).not.toContain('effective 2026-05-04');
  });

  test('throws when rates.rb format is unrecognized', () => {
    const broken = `module Foo\nend`;
    expect(() => updateRatesRb(broken, 'ups', 47.25, '2026-05-04')).toThrow(/매칭 실패/);
  });
});
```

- [ ] **Step 3: 테스트 실행 (FAIL 확인)**

```bash
bun test tests/modifiers/ratesRb.test.ts
```

Expected: FAIL with "Cannot find module '../../src/modifiers/ratesRb'"

- [ ] **Step 4: src/modifiers/ratesRb.ts 구현**

```typescript
import type { Carrier } from '../types';

const VAR_NAME: Record<Carrier, string> = {
  ups: 'DEFAULT_FSC_PERCENT',
  dhl: 'DEFAULT_FSC_PERCENT_DHL',
  fedex: 'DEFAULT_FSC_PERCENT_FEDEX',
  ocs: 'DEFAULT_FSC_PERCENT_OCS',
};

/** 47 → "47.00", 47.5 → "47.50", 47.25 → "47.25" (항상 두자리 통일). */
function formatRubyFloat(value: number): string {
  return value.toFixed(2);
}

/**
 * smart-quote-api/lib/constants/rates.rb 의 DEFAULT_FSC_PERCENT* 상수 갱신.
 *
 * Ruby 형식: `KEY = 47.25 # comment` (semicolon 없음, = 양쪽 공백)
 * 값 형식: 항상 두자리 (47.00, 47.25)
 */
export function updateRatesRb(
  content: string,
  carrier: Carrier,
  newValue: number,
  newDate: string,
): string {
  const varName = VAR_NAME[carrier];
  const formatted = formatRubyFloat(newValue);

  // Pattern 1: effective 있는 경우
  const withEffective = new RegExp(
    `(\\b${varName} = )([\\d.]+)(\\s*#[^\\n]*?effective )(\\d{4}-\\d{2}-\\d{2})([^\\n]*)`,
  );
  if (withEffective.test(content)) {
    return content.replace(
      withEffective,
      (_, p1, _p2, p3, _p4, p5) => `${p1}${formatted}${p3}${newDate}${p5}`,
    );
  }

  // Pattern 2: effective 없는 경우
  const valueOnly = new RegExp(`(\\b${varName} = )([\\d.]+)(\\s*#)`);
  if (valueOnly.test(content)) {
    return content.replace(valueOnly, (_, p1, _p2, p3) => `${p1}${formatted}${p3}`);
  }

  throw new Error(
    `[ratesRb] ${varName} 정규식 매칭 실패. rates.rb 형식이 변경되었거나 상수가 없습니다.`,
  );
}
```

- [ ] **Step 5: 테스트 실행 (PASS 확인)**

```bash
bun test tests/modifiers/ratesRb.test.ts
```

Expected: 4 pass, 0 fail

- [ ] **Step 6: Commit**

```bash
git add src/modifiers/ratesRb.ts tests/modifiers/ratesRb.test.ts tests/fixtures/sample-rates.rb
git commit -m "feat(modifiers): updateRatesRb with two-decimal Ruby normalization"
```

---

## Task 5: Modifier `fscHistory` (TDD, entry 추가 + 중복 + force)

**Files:**
- Create: `~/Developer/Tools/fsc-sync/tests/fixtures/sample-fsc-history.ts`
- Create: `~/Developer/Tools/fsc-sync/tests/modifiers/fscHistory.test.ts`
- Create: `~/Developer/Tools/fsc-sync/src/modifiers/fscHistory.ts`

### Cycle 5.1 — Setup fixture + 일반 entry 추가

- [ ] **Step 1: fixture 작성**

`tests/fixtures/sample-fsc-history.ts`:

```typescript
// Mimics emax/src/config/fsc-history.ts structure.
export const DEFAULT_FSC_HISTORY = {
  ups: [
    { date: '2026-04-20', rate: 47.5 },
    { date: '2026-04-27', rate: 45.5 },
  ],
  dhl: [
    { date: '2026-04-20', rate: 47.75 },
    { date: '2026-04-27', rate: 48.0 },
  ],
  fedex: [
    { date: '2026-04-20', rate: 45.5 },
    { date: '2026-04-27', rate: 43.5 },
  ],
};
```

- [ ] **Step 2: 실패하는 첫 테스트**

`tests/modifiers/fscHistory.test.ts`:

```typescript
import { test, expect, describe } from 'bun:test';
import { readFileSync } from 'fs';
import { join } from 'path';
import { addHistoryEntry } from '../../src/modifiers/fscHistory';

const FIXTURE_PATH = join(import.meta.dir, '../fixtures/sample-fsc-history.ts');
const ORIGINAL = readFileSync(FIXTURE_PATH, 'utf-8');

describe('addHistoryEntry', () => {
  test('appends UPS entry at end of ups array (preserving 4-space indent)', () => {
    const result = addHistoryEntry(ORIGINAL, 'ups', 47.25, '2026-05-04');
    expect(result).toContain(
      `    { date: '2026-04-27', rate: 45.5 },\n    { date: '2026-05-04', rate: 47.25 },\n  ],`,
    );
    // dhl 배열은 영향 없음
    expect(result).toContain(`{ date: '2026-04-27', rate: 48 }`);
  });
});
```

- [ ] **Step 3: 테스트 실행 (FAIL 확인)**

```bash
bun test tests/modifiers/fscHistory.test.ts
```

Expected: FAIL with "Cannot find module"

- [ ] **Step 4: 최소 구현**

`src/modifiers/fscHistory.ts`:

```typescript
import type { Carrier } from '../types';

interface AddHistoryOptions {
  force?: boolean; // 동일 date 이미 있을 때 덮어쓰기 허용
}

/**
 * src/config/fsc-history.ts 의 carrier 배열에 새 entry 추가.
 *
 * spec 6.3 — 2-step 정규식:
 *   1. carrier 배열 블록 추출
 *   2. 마지막 entry 뒤에 새 entry 삽입 (4-space indent)
 *
 * 중복 date entry 검사:
 *   - default: throw Error
 *   - force=true: 기존 entry 새 값으로 교체
 *
 * @throws Error 배열 미존재 또는 중복 date (force 없이)
 */
export function addHistoryEntry(
  content: string,
  carrier: Carrier,
  rate: number,
  date: string,
  options: AddHistoryOptions = {},
): string {
  const blockRegex = new RegExp(
    `(\\b${carrier}: \\[\\n)([\\s\\S]*?)(\\n  \\],)`,
  );
  const match = content.match(blockRegex);
  if (!match) {
    throw new Error(
      `[fscHistory] ${carrier} 배열을 찾을 수 없습니다. fsc-history.ts에 ${carrier} 배열이 없거나 형식이 다릅니다.`,
    );
  }
  const [, prefix, body, suffix] = match;

  // 중복 date 검사
  const dupRegex = new RegExp(
    `\\{ date: '${escapeRegex(date)}', rate: [\\d.]+ \\},`,
  );
  if (dupRegex.test(body)) {
    if (!options.force) {
      throw new Error(
        `[fscHistory] ${carrier} 배열에 이미 ${date} entry가 있습니다. --force로 덮어쓰기 가능합니다.`,
      );
    }
    // force: 기존 entry를 새 값으로 교체
    const newBody = body.replace(
      dupRegex,
      `{ date: '${date}', rate: ${rate} },`,
    );
    return content.replace(blockRegex, `${prefix}${newBody}${suffix}`);
  }

  // 새 entry append
  const newEntry = `    { date: '${date}', rate: ${rate} },`;
  return content.replace(blockRegex, `${prefix}${body}\n${newEntry}${suffix}`);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

- [ ] **Step 5: 테스트 실행 (PASS 확인)**

```bash
bun test tests/modifiers/fscHistory.test.ts
```

Expected: 1 pass, 0 fail

- [ ] **Step 6: Commit**

```bash
git add src/modifiers/fscHistory.ts tests/modifiers/fscHistory.test.ts tests/fixtures/sample-fsc-history.ts
git commit -m "feat(modifiers): addHistoryEntry append for fsc-history.ts"
```

### Cycle 5.2 — 중복 검사 + force + 누락 배열

- [ ] **Step 1: 추가 테스트 작성**

`tests/modifiers/fscHistory.test.ts` 에 추가:

```typescript
test('throws on duplicate date without --force', () => {
  expect(() => addHistoryEntry(ORIGINAL, 'ups', 99.99, '2026-04-27')).toThrow(
    /이미 2026-04-27 entry가 있습니다/,
  );
});

test('overwrites existing entry with --force', () => {
  const result = addHistoryEntry(ORIGINAL, 'ups', 99.99, '2026-04-27', { force: true });
  expect(result).toContain(`{ date: '2026-04-27', rate: 99.99 },`);
  // 중복 라인 발생 안 함
  const matches = result.match(/{ date: '2026-04-27', rate:/g);
  expect(matches?.length).toBe(1);
});

test('throws when carrier array does not exist (e.g., main has no fedex)', () => {
  const mainStyle = `export const DEFAULT_FSC_HISTORY = {
  ups: [
    { date: '2026-04-27', rate: 45.5 },
  ],
  dhl: [
    { date: '2026-04-27', rate: 48.0 },
  ],
};`;
  expect(() => addHistoryEntry(mainStyle, 'fedex', 45.25, '2026-05-04')).toThrow(
    /fedex 배열을 찾을 수 없습니다/,
  );
});
```

- [ ] **Step 2: 테스트 실행 (PASS 확인 — 구현은 이미 처리)**

```bash
bun test tests/modifiers/fscHistory.test.ts
```

Expected: 4 pass, 0 fail

- [ ] **Step 3: Commit**

```bash
git add tests/modifiers/fscHistory.test.ts
git commit -m "test(fscHistory): cover duplicate, --force overwrite, missing array"
```

---

## Task 6: Modifier `commitMessage` (TDD, 매트릭스)

**Files:**
- Create: `~/Developer/Tools/fsc-sync/tests/modifiers/commitMessage.test.ts`
- Create: `~/Developer/Tools/fsc-sync/src/modifiers/commitMessage.ts`

- [ ] **Step 1: 실패하는 테스트 작성 (4개 시나리오)**

`tests/modifiers/commitMessage.test.ts`:

```typescript
import { test, expect, describe } from 'bun:test';
import { generateCommitMessage } from '../../src/modifiers/commitMessage';
import type { ProjectConfig } from '../../src/types';

const MAIN: ProjectConfig = {
  name: 'main',
  path: '/x',
  carriers: ['ups', 'dhl'],
  files: { ratesTs: 'a', ratesRb: 'b', fscHistory: 'c' },
};

const EMAX: ProjectConfig = {
  name: 'emax',
  path: '/y',
  carriers: ['ups', 'dhl', 'fedex', 'ocs'],
  files: { ratesTs: 'a', ratesRb: 'b', fscHistory: 'c' },
};

describe('generateCommitMessage', () => {
  test('main with UPS+DHL changed', () => {
    const msg = generateCommitMessage({
      project: MAIN,
      date: '2026-05-04',
      changes: [
        { carrier: 'ups', oldValue: 45.5, newValue: 47.25 },
        { carrier: 'dhl', oldValue: 48.0, newValue: 47.0 },
      ],
      skippedCarriers: [],
      includesHistory: true,
    });
    expect(msg).toBe(
      `⛽ chore(fsc): 2026-05-04 FSC 업데이트 — UPS 45.50→47.25%, DHL 48.00→47.00% (frontend+backend+history 동시)`,
    );
  });

  test('emax with UPS/DHL/FedEx changed, OCS skipped', () => {
    const msg = generateCommitMessage({
      project: EMAX,
      date: '2026-05-04',
      changes: [
        { carrier: 'ups', oldValue: 45.5, newValue: 47.25 },
        { carrier: 'dhl', oldValue: 48.0, newValue: 47.0 },
        { carrier: 'fedex', oldValue: 43.5, newValue: 45.25 },
      ],
      skippedCarriers: ['ocs'],
      includesHistory: true,
    });
    expect(msg).toBe(
      `⛽ chore(fsc): 2026-05-04 FSC 업데이트 — UPS 45.50→47.25%, DHL 48.00→47.00%, FedEx 43.50→45.25% (OCS 동일, frontend+backend+history 동시)`,
    );
  });

  test('main with only UPS changed (DHL skipped)', () => {
    const msg = generateCommitMessage({
      project: MAIN,
      date: '2026-05-04',
      changes: [{ carrier: 'ups', oldValue: 45.5, newValue: 47.25 }],
      skippedCarriers: ['dhl'],
      includesHistory: true,
    });
    expect(msg).toBe(
      `⛽ chore(fsc): 2026-05-04 FSC 업데이트 — UPS 45.50→47.25% (DHL 동일, frontend+backend+history 동시)`,
    );
  });

  test('--no-history changes suffix', () => {
    const msg = generateCommitMessage({
      project: MAIN,
      date: '2026-05-04',
      changes: [{ carrier: 'ups', oldValue: 45.5, newValue: 47.25 }],
      skippedCarriers: ['dhl'],
      includesHistory: false,
    });
    expect(msg).toContain(`(DHL 동일, frontend+backend 동시)`);
  });
});
```

- [ ] **Step 2: 테스트 실행 (FAIL 확인)**

```bash
bun test tests/modifiers/commitMessage.test.ts
```

Expected: FAIL with "Cannot find module"

- [ ] **Step 3: 구현**

`src/modifiers/commitMessage.ts`:

```typescript
import type { Carrier, ProjectConfig } from '../types';

interface ChangeEntry {
  carrier: Carrier;
  oldValue: number;
  newValue: number;
}

interface GenerateOptions {
  project: ProjectConfig;
  date: string;
  changes: ChangeEntry[]; // 변경된 carrier
  skippedCarriers: Carrier[]; // project carriers 안에 있지만 미입력
  includesHistory: boolean;
}

const CARRIER_DISPLAY: Record<Carrier, string> = {
  ups: 'UPS',
  dhl: 'DHL',
  fedex: 'FedEx',
  ocs: 'OCS',
};

/** 항상 두자리 (45.50, 47.0). spec 6.4 */
function formatPct(n: number): string {
  return n.toFixed(2);
}

/**
 * spec 6.4 — commit message 자동 생성.
 *
 * 매트릭스:
 *   - 변경된 carrier만 본문에 (UPS 45.50→47.25%, ...)
 *   - skip된 carrier 1개 이상이면 (X 동일) 또는 (X/Y 동일) 추가
 *   - history 미갱신 시 suffix만 (frontend+backend 동시)
 */
export function generateCommitMessage(opts: GenerateOptions): string {
  const { date, changes, skippedCarriers, includesHistory } = opts;

  if (changes.length === 0) {
    throw new Error('[commitMessage] 변경된 carrier가 없습니다. plan 단계에서 abort 했어야 합니다.');
  }

  const changeStr = changes
    .map((c) => `${CARRIER_DISPLAY[c.carrier]} ${formatPct(c.oldValue)}→${formatPct(c.newValue)}%`)
    .join(', ');

  const parts: string[] = [];
  if (skippedCarriers.length > 0) {
    const skippedStr = skippedCarriers.map((c) => CARRIER_DISPLAY[c]).join('/');
    parts.push(`${skippedStr} 동일`);
  }
  parts.push(includesHistory ? 'frontend+backend+history 동시' : 'frontend+backend 동시');

  return `⛽ chore(fsc): ${date} FSC 업데이트 — ${changeStr} (${parts.join(', ')})`;
}
```

- [ ] **Step 4: 테스트 실행 (PASS 확인)**

```bash
bun test tests/modifiers/commitMessage.test.ts
```

Expected: 4 pass, 0 fail

- [ ] **Step 5: Commit**

```bash
git add src/modifiers/commitMessage.ts tests/modifiers/commitMessage.test.ts
git commit -m "feat(modifiers): generateCommitMessage matrix (changed/skipped/history)"
```

---

## Task 7: `differ` — 사용자 친화 diff 출력

**Files:**
- Create: `~/Developer/Tools/fsc-sync/src/differ.ts`

> Note: 이 모듈은 사이드이펙트 (console.log)가 주요 동작이라 단위 테스트보다 manual 검증이 적합. 시각적 출력 일관성만 보장.

- [ ] **Step 1: 구현**

`src/differ.ts`:

```typescript
import kleur from 'kleur';
import type { ChangePlan } from './types';

/** spec 4.1 의 "📊 적용 대상" + "📝 변경될 파일" 섹션 출력. */
export function printPlan(plan: ChangePlan): void {
  console.log('');
  console.log(kleur.bold('📊 적용 대상:'));

  for (const proj of plan.projects) {
    const head = `  ${kleur.cyan(`✓ ${proj.project.name}:`)} `;

    const lines: string[] = [];
    for (const change of proj.changes.filter((c) => c.fileType === 'ratesTs')) {
      const arrow = change.newValue > (change.oldValue ?? 0) ? '↑' : '↓';
      const delta = change.oldValue !== null
        ? (change.newValue - change.oldValue).toFixed(2)
        : 'new';
      const sign = change.newValue > (change.oldValue ?? 0) ? '+' : '';
      lines.push(
        `${displayCarrier(change.carrier)} ${(change.oldValue ?? 0).toFixed(2)} → ${change.newValue.toFixed(2)} ${arrow}${sign}${delta}`,
      );
    }

    // skipped carriers 표시
    if (proj.skippedCarriers.length > 0) {
      const skipStr = proj.skippedCarriers
        .map((c) => `${displayCarrier(c)} (skip, 미입력)`)
        .join(' | ');
      lines.push(kleur.gray(skipStr));
    }

    console.log(head + lines.join(' | '));
  }

  console.log(`  ${kleur.dim(`📅 effective date: ${plan.effectiveDate}`)}`);
  console.log('');
  console.log(kleur.bold(`📝 변경될 파일 (총 ${countFiles(plan)}개):`));

  for (const proj of plan.projects) {
    const fileGroups = groupBy(proj.changes, 'fileType');
    for (const [fileType, fileChanges] of fileGroups) {
      const carriers = fileChanges.map((c) => displayCarrier(c.carrier)).join(', ');
      const filePath = fileChanges[0].filePath;
      const relPath = filePath.replace(proj.project.path + '/', '');
      console.log(`  ${proj.project.name}/${relPath}  ${kleur.dim(`(${carriers})`)}`);
    }
    // .commit_message.txt
    console.log(`  ${proj.project.name}/.commit_message.txt  ${kleur.dim('(auto-generated)')}`);
  }
  console.log('');
}

function displayCarrier(c: string): string {
  return c === 'ups' ? 'UPS' : c === 'dhl' ? 'DHL' : c === 'fedex' ? 'FedEx' : 'OCS';
}

function countFiles(plan: ChangePlan): number {
  return plan.projects.reduce((sum, p) => {
    const types = new Set(p.changes.map((c) => c.fileType));
    return sum + types.size + 1; // +1 for .commit_message.txt
  }, 0);
}

function groupBy<T, K extends keyof T>(arr: T[], key: K): Map<T[K], T[]> {
  const m = new Map<T[K], T[]>();
  for (const item of arr) {
    const k = item[key];
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(item);
  }
  return m;
}
```

- [ ] **Step 2: 타입 검증**

```bash
bunx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add src/differ.ts
git commit -m "feat(differ): printPlan with kleur colored diff output"
```

---

## Task 8: `git` wrapper (subprocess via Bun.spawn)

**Files:**
- Create: `~/Developer/Tools/fsc-sync/src/git.ts`
- Create: `~/Developer/Tools/fsc-sync/tests/git.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성 (Bun.spawn 모킹은 어려우므로 wrapper의 command 생성 로직만 단위 테스트)**

`tests/git.test.ts`:

```typescript
import { test, expect, describe } from 'bun:test';
import { buildGitCommand } from '../src/git';

describe('buildGitCommand', () => {
  test('add command with multiple files', () => {
    const cmd = buildGitCommand('add', { files: ['a.ts', 'b.rb'] });
    expect(cmd).toEqual(['git', 'add', 'a.ts', 'b.rb']);
  });

  test('commit with -F message file', () => {
    const cmd = buildGitCommand('commit', { messageFile: '.commit_message.txt' });
    expect(cmd).toEqual(['git', 'commit', '-F', '.commit_message.txt']);
  });

  test('push to origin HEAD:main', () => {
    const cmd = buildGitCommand('push', { remote: 'origin', refspec: 'HEAD:main' });
    expect(cmd).toEqual(['git', 'push', 'origin', 'HEAD:main']);
  });

  test('checkout -- . for rollback', () => {
    const cmd = buildGitCommand('checkout', { paths: ['--', '.'] });
    expect(cmd).toEqual(['git', 'checkout', '--', '.']);
  });
});
```

- [ ] **Step 2: 테스트 실행 (FAIL 확인)**

```bash
bun test tests/git.test.ts
```

Expected: FAIL with "Cannot find module"

- [ ] **Step 3: 구현**

`src/git.ts`:

```typescript
type GitOp = 'add' | 'commit' | 'push' | 'checkout';

interface GitOptions {
  files?: string[]; // for add
  messageFile?: string; // for commit -F
  remote?: string; // for push
  refspec?: string; // for push
  paths?: string[]; // for checkout
}

/** Pure 함수 — Bun.spawn에 넘길 command 배열 생성 (테스트 가능). */
export function buildGitCommand(op: GitOp, opts: GitOptions): string[] {
  const cmd = ['git', op];
  if (op === 'add' && opts.files) cmd.push(...opts.files);
  if (op === 'commit' && opts.messageFile) cmd.push('-F', opts.messageFile);
  if (op === 'push' && opts.remote && opts.refspec) cmd.push(opts.remote, opts.refspec);
  if (op === 'checkout' && opts.paths) cmd.push(...opts.paths);
  return cmd;
}

interface RunResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
}

/** Bun.spawn 으로 git 명령 실행. cwd는 프로젝트 디렉토리. */
export async function runGit(cwd: string, op: GitOp, opts: GitOptions): Promise<RunResult> {
  const cmd = buildGitCommand(op, opts);
  const proc = Bun.spawn(cmd, {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  return { ok: exitCode === 0, stdout, stderr, exitCode };
}

/** 편의 함수: project에서 add+commit+push까지. 각 단계 실패 시 그 결과 반환. */
export async function commitAndPush(
  cwd: string,
  filesToAdd: string[],
  messageFile: string,
  options: { push: boolean },
): Promise<{ stage: 'add' | 'commit' | 'push' | 'done'; result: RunResult }> {
  const addRes = await runGit(cwd, 'add', { files: filesToAdd });
  if (!addRes.ok) return { stage: 'add', result: addRes };

  const commitRes = await runGit(cwd, 'commit', { messageFile });
  if (!commitRes.ok) return { stage: 'commit', result: commitRes };

  if (!options.push) return { stage: 'done', result: commitRes };

  const pushRes = await runGit(cwd, 'push', { remote: 'origin', refspec: 'HEAD:main' });
  if (!pushRes.ok) return { stage: 'push', result: pushRes };

  return { stage: 'done', result: pushRes };
}

/** rollback: 변경되었지만 commit 전인 파일들을 원복. */
export async function rollback(cwd: string): Promise<RunResult> {
  return runGit(cwd, 'checkout', { paths: ['--', '.'] });
}
```

- [ ] **Step 4: 테스트 실행 (PASS 확인)**

```bash
bun test tests/git.test.ts
```

Expected: 4 pass, 0 fail

- [ ] **Step 5: Commit**

```bash
git add src/git.ts tests/git.test.ts
git commit -m "feat(git): buildGitCommand + runGit/commitAndPush/rollback wrappers"
```

---

## Task 9: CLI orchestrator

**Files:**
- Create: `~/Developer/Tools/fsc-sync/src/cli.ts`

> Note: CLI 자체는 통합 테스트로 검증. 단위 테스트는 validation 함수만.

- [ ] **Step 1: validation 함수 분리 + 테스트**

`tests/cli-validation.test.ts`:

```typescript
import { test, expect, describe } from 'bun:test';
import { validateRates, validateDate } from '../src/cli';

describe('validateRates', () => {
  test('accepts valid rates', () => {
    expect(() => validateRates({ ups: 47.25, dhl: 47.0 })).not.toThrow();
  });

  test('rejects out-of-range value', () => {
    expect(() => validateRates({ ups: 200 })).toThrow(/0 ≤/);
    expect(() => validateRates({ ups: -1 })).toThrow(/0 ≤/);
  });

  test('rejects empty input (no carriers provided)', () => {
    expect(() => validateRates({})).toThrow(/적어도 1개 carrier/);
  });
});

describe('validateDate', () => {
  test('accepts today', () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(() => validateDate(today)).not.toThrow();
  });

  test('rejects bad format', () => {
    expect(() => validateDate('2026/05/04')).toThrow(/YYYY-MM-DD/);
    expect(() => validateDate('05-04-2026')).toThrow(/YYYY-MM-DD/);
  });

  test('rejects more than 7 days from today', () => {
    expect(() => validateDate('2030-01-01')).toThrow(/오늘 ~ 7일 이내/);
  });
});
```

- [ ] **Step 2: 테스트 실행 (FAIL 확인)**

```bash
bun test tests/cli-validation.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: src/cli.ts 작성 (validation + main 함수)**

`src/cli.ts`:

```typescript
import { Command } from 'commander';
import prompts from 'prompts';
import kleur from 'kleur';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import type {
  Carrier,
  CliOptions,
  FscRates,
  ChangePlan,
  ProjectChangePlan,
  FileChange,
} from './types';
import { PROJECTS } from './config';
import { updateRatesTs } from './modifiers/ratesTs';
import { updateRatesRb } from './modifiers/ratesRb';
import { addHistoryEntry } from './modifiers/fscHistory';
import { generateCommitMessage } from './modifiers/commitMessage';
import { printPlan } from './differ';
import { commitAndPush, rollback } from './git';

const ALL_CARRIERS: Carrier[] = ['ups', 'dhl', 'fedex', 'ocs'];

// ──────────────── Validation (testable, exported) ────────────────

export function validateRates(rates: FscRates): void {
  const provided = Object.entries(rates).filter(([, v]) => v !== undefined);
  if (provided.length === 0) {
    throw new Error('적어도 1개 carrier 값을 입력해야 합니다.');
  }
  for (const [carrier, value] of provided) {
    if (typeof value !== 'number' || isNaN(value) || value < 0 || value > 100) {
      throw new Error(`${carrier}: 0 ≤ pct ≤ 100 범위여야 합니다 (입력값: ${value}).`);
    }
  }
}

export function validateDate(date: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('date 형식은 YYYY-MM-DD 여야 합니다.');
  }
  const today = new Date();
  const target = new Date(date);
  const diffDays = Math.abs(target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays > 7) {
    throw new Error('date는 오늘 ~ 7일 이내여야 합니다 (오타 방지).');
  }
}

// ──────────────── Hybrid input (CLI args + prompts fallback) ────────────────

async function gatherRates(opts: CliOptions): Promise<FscRates> {
  const rates: FscRates = {};
  if (opts.ups !== undefined) rates.ups = opts.ups;
  if (opts.dhl !== undefined) rates.dhl = opts.dhl;
  if (opts.fedex !== undefined) rates.fedex = opts.fedex;
  if (opts.ocs !== undefined) rates.ocs = opts.ocs;

  if (opts.yes) return rates; // --yes: prompts skip

  // 빠진 carrier에 대해 prompt
  for (const carrier of ALL_CARRIERS) {
    if (rates[carrier] !== undefined) continue;
    const skipHint = carrier === 'ocs' ? ', Enter=skip' : '';
    const projectHint = carrier === 'fedex' || carrier === 'ocs' ? ' (emax만 적용)' : '';
    const response = await prompts({
      type: 'text',
      name: 'value',
      message: `${carrier.toUpperCase()} FSC%${projectHint}${skipHint}`,
      validate: (v) => {
        if (v === '' && carrier === 'ocs') return true;
        const n = parseFloat(v);
        if (isNaN(n) || n < 0 || n > 100) return '0-100 범위 숫자';
        return true;
      },
    });
    if (response.value !== undefined && response.value !== '') {
      rates[carrier] = parseFloat(response.value);
    }
  }
  return rates;
}

async function gatherDate(opts: CliOptions): Promise<string> {
  if (opts.date) return opts.date;
  const today = new Date().toISOString().slice(0, 10);
  if (opts.yes) return today;
  const response = await prompts({
    type: 'text',
    name: 'date',
    message: `Effective date (YYYY-MM-DD, 기본=${today})`,
    initial: today,
  });
  return response.date || today;
}

// ──────────────── Plan 생성 ────────────────

function buildPlan(
  rates: FscRates,
  date: string,
  opts: CliOptions,
): ChangePlan {
  const targetProjects = opts.only
    ? PROJECTS.filter((p) => p.name === opts.only)
    : PROJECTS;

  const projects: ProjectChangePlan[] = targetProjects.map((project) => {
    const applied: Carrier[] = [];
    const skipped: Carrier[] = [];
    const changes: FileChange[] = [];

    for (const carrier of project.carriers) {
      const newValue = rates[carrier];
      if (newValue === undefined) {
        skipped.push(carrier);
        continue;
      }
      applied.push(carrier);

      // rates.ts 현재값 읽기
      const ratesTsPath = join(project.path, project.files.ratesTs);
      const ratesTsContent = readFileSync(ratesTsPath, 'utf-8');
      const oldValue = extractCurrentValue(ratesTsContent, carrier);

      changes.push(
        {
          project: project.name,
          filePath: ratesTsPath,
          fileType: 'ratesTs',
          carrier,
          oldValue,
          newValue,
          description: `${carrier} ${oldValue} → ${newValue}`,
        },
        {
          project: project.name,
          filePath: join(project.path, project.files.ratesRb),
          fileType: 'ratesRb',
          carrier,
          oldValue,
          newValue,
          description: '',
        },
      );

      if (!opts.noHistory) {
        changes.push({
          project: project.name,
          filePath: join(project.path, project.files.fscHistory),
          fileType: 'fscHistory',
          carrier,
          oldValue: null,
          newValue,
          description: 'history entry',
        });
      }
    }

    const commitMessage = generateCommitMessage({
      project,
      date,
      changes: applied.map((c) => ({
        carrier: c,
        oldValue: changes.find((x) => x.carrier === c && x.fileType === 'ratesTs')!.oldValue!,
        newValue: rates[c]!,
      })),
      skippedCarriers: skipped,
      includesHistory: !opts.noHistory,
    });

    return { project, changes, commitMessage, appliedCarriers: applied, skippedCarriers: skipped };
  });

  return { projects, effectiveDate: date, rates };
}

function extractCurrentValue(content: string, carrier: Carrier): number {
  const varName = {
    ups: 'DEFAULT_FSC_PERCENT',
    dhl: 'DEFAULT_FSC_PERCENT_DHL',
    fedex: 'DEFAULT_FSC_PERCENT_FEDEX',
    ocs: 'DEFAULT_FSC_PERCENT_OCS',
  }[carrier];
  const match = content.match(new RegExp(`${varName} = ([\\d.]+);`));
  if (!match) throw new Error(`현재값 추출 실패: ${varName} not found`);
  return parseFloat(match[1]);
}

// ──────────────── 파일 적용 ────────────────

function applyChanges(planForProject: ProjectChangePlan, effectiveDate: string, force: boolean): string[] {
  const writtenFiles: string[] = [];
  const fileGroups = new Map<string, FileChange[]>();
  for (const c of planForProject.changes) {
    if (!fileGroups.has(c.filePath)) fileGroups.set(c.filePath, []);
    fileGroups.get(c.filePath)!.push(c);
  }

  for (const [filePath, changes] of fileGroups) {
    let content = readFileSync(filePath, 'utf-8');
    for (const change of changes) {
      if (change.fileType === 'ratesTs') {
        content = updateRatesTs(content, change.carrier, change.newValue, effectiveDate);
      } else if (change.fileType === 'ratesRb') {
        content = updateRatesRb(content, change.carrier, change.newValue, effectiveDate);
      } else if (change.fileType === 'fscHistory') {
        content = addHistoryEntry(content, change.carrier, change.newValue, effectiveDate, { force });
      }
    }
    writeFileSync(filePath, content, 'utf-8');
    writtenFiles.push(filePath);
  }

  // .commit_message.txt
  const commitFilePath = join(planForProject.project.path, '.commit_message.txt');
  writeFileSync(commitFilePath, planForProject.commitMessage + '\n', 'utf-8');
  writtenFiles.push(commitFilePath);

  return writtenFiles;
}

// ──────────────── Main entry ────────────────

export async function main(argv: string[]): Promise<number> {
  const program = new Command();
  program
    .name('fsc-sync')
    .description('Sync weekly FSC rates across smart-quote-main and smart-quote-emax')
    .option('--ups <pct>', 'UPS FSC%', parseFloat)
    .option('--dhl <pct>', 'DHL FSC%', parseFloat)
    .option('--fedex <pct>', 'FedEx FSC% (emax only)', parseFloat)
    .option('--ocs <pct>', 'OCS FSC% (emax only)', parseFloat)
    .option('--date <YYYY-MM-DD>', 'effective date (default: today)')
    .option('--only <name>', 'main | emax')
    .option('--no-history', 'skip fsc-history.ts')
    .option('--force', 'overwrite existing date entry in fsc-history')
    .option('--dry-run', 'preview only, no file/git change')
    .option('-y, --yes', 'skip confirmation prompt')
    .option('--no-push', 'commit only, skip git push')
    .option('-v, --verbose', 'verbose logging')
    .version('1.0.0');

  program.parse(argv);
  const opts = program.opts<CliOptions>();

  try {
    const rates = await gatherRates(opts);
    validateRates(rates);
    const date = await gatherDate(opts);
    validateDate(date);

    const plan = buildPlan(rates, date, opts);
    printPlan(plan);

    if (opts.dryRun) {
      console.log(kleur.yellow('📋 [DRY RUN] 실제 수정/commit/push 안 함.'));
      return 0;
    }

    if (!opts.yes) {
      const confirm = await prompts({
        type: 'confirm',
        name: 'go',
        message: opts.noPush
          ? '양쪽 프로젝트 commit? (push는 생략)'
          : '양쪽 프로젝트 commit & push? (Vercel + Render 빌드 트리거됨)',
        initial: true,
      });
      if (!confirm.go) {
        console.log(kleur.gray('취소됨.'));
        return 0;
      }
    }

    // ──── 파일 수정 + commit + push (각 프로젝트별 atomic-where-possible) ────
    let project1Committed = false;
    for (const proj of plan.projects) {
      try {
        applyChanges(proj, plan.effectiveDate, opts.force ?? false);
      } catch (err) {
        console.error(kleur.red(`✗ ${proj.project.name}: 파일 수정 실패 — ${(err as Error).message}`));
        // rollback this project
        await rollback(proj.project.path);
        // 만약 project 1 이미 commit 됐으면 그건 보존
        if (project1Committed) {
          console.error(kleur.yellow('⚠️  project 1은 commit된 상태로 유지됩니다. 수동 처리 필요.'));
        }
        return 2;
      }

      const result = await commitAndPush(
        proj.project.path,
        Object.values(proj.project.files).map((f) => join(proj.project.path, f)).concat(
          [join(proj.project.path, '.commit_message.txt')],
        ),
        join(proj.project.path, '.commit_message.txt'),
        { push: !opts.noPush },
      );

      if (result.stage !== 'done') {
        console.error(kleur.red(`✗ ${proj.project.name}: ${result.stage} 실패`));
        console.error(result.result.stderr);
        if (result.stage === 'commit') await rollback(proj.project.path);
        return 3;
      }

      console.log(kleur.green(`✓ ${proj.project.name}: ${opts.noPush ? 'committed' : 'pushed'}`));
      project1Committed = true;
    }

    console.log('');
    console.log(kleur.bold().green('🎉 완료. Vercel + Render 빌드를 확인하세요.'));
    return 0;
  } catch (err) {
    console.error(kleur.red(`✗ ${(err as Error).message}`));
    return 1;
  }
}
```

- [ ] **Step 4: validation 테스트 실행 (PASS 확인)**

```bash
bun test tests/cli-validation.test.ts
```

Expected: 5 pass, 0 fail

- [ ] **Step 5: 전체 타입 체크**

```bash
bunx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 6: Commit**

```bash
git add src/cli.ts tests/cli-validation.test.ts
git commit -m "feat(cli): orchestrator with validation, hybrid input, confirm gate, rollback"
```

---

## Task 10: Entry point `bin/fsc-sync.ts`

**Files:**
- Create: `~/Developer/Tools/fsc-sync/bin/fsc-sync.ts`

- [ ] **Step 1: 작성**

`bin/fsc-sync.ts`:

```typescript
#!/usr/bin/env bun
import { main } from '../src/cli';

main(process.argv).then((code) => process.exit(code));
```

- [ ] **Step 2: 실행 권한 부여**

```bash
chmod +x bin/fsc-sync.ts
```

- [ ] **Step 3: --help 동작 확인**

```bash
cd ~/Developer/Tools/fsc-sync
bun bin/fsc-sync.ts --help
```

Expected: commander 도움말 출력 (`fsc-sync [options]`, 모든 옵션 나열)

- [ ] **Step 4: --version 확인**

```bash
bun bin/fsc-sync.ts --version
```

Expected: `1.0.0`

- [ ] **Step 5: Commit**

```bash
git add bin/fsc-sync.ts
git commit -m "feat(bin): add CLI entry point with shebang"
```

---

## Task 11: install.sh

**Files:**
- Create: `~/Developer/Tools/fsc-sync/install.sh`

- [ ] **Step 1: 작성**

`install.sh`:

```bash
#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

echo "→ Installing dependencies..."
bun install

echo "→ Compiling single binary..."
mkdir -p "$HOME/.local/bin"
bun build bin/fsc-sync.ts --compile --outfile "$HOME/.local/bin/fsc-sync"
chmod +x "$HOME/.local/bin/fsc-sync"

echo "→ Verifying..."
"$HOME/.local/bin/fsc-sync" --version

if ! echo "$PATH" | grep -q "$HOME/.local/bin"; then
  echo ""
  echo "⚠️  ~/.local/bin이 PATH에 없습니다. ~/.zshrc에 다음 추가 후 재시작:"
  echo '    export PATH="$HOME/.local/bin:$PATH"'
fi

echo ""
echo "✓ Installed. 'fsc-sync --help' 로 시작하세요."
```

- [ ] **Step 2: 실행 권한 부여**

```bash
chmod +x install.sh
```

- [ ] **Step 3: 설치 실행**

```bash
./install.sh
```

Expected:
- bun install 성공
- bun build 성공
- ~/.local/bin/fsc-sync 생성
- "1.0.0" 출력 (version 확인)
- PATH 안내 (없으면)

- [ ] **Step 4: 전역 설치 확인**

PATH가 이미 ~/.local/bin 포함하면:
```bash
fsc-sync --version
```
Expected: `1.0.0`

PATH 없으면 안내 따라 ~/.zshrc 수정 후 새 터미널에서 재시도.

- [ ] **Step 5: Commit**

```bash
git add install.sh
git commit -m "feat(install): bun build --compile to ~/.local/bin/fsc-sync"
```

---

## Task 12: README.md

**Files:**
- Create: `~/Developer/Tools/fsc-sync/README.md`

- [ ] **Step 1: 작성**

`README.md`:

````markdown
# fsc-sync

매주 한 명령으로 **smart-quote-main**과 **smart-quote-emax** 두 프로젝트의 FSC(Fuel Surcharge) 값을 동기화하는 CLI 도구.

## Install

```bash
cd ~/Developer/Tools/fsc-sync
./install.sh
```

`~/.local/bin`이 PATH에 없으면 안내에 따라 `~/.zshrc` 업데이트.

## Usage

### 빠른 모드 (한 줄)

```bash
fsc-sync --ups 47.25 --dhl 47.00 --fedex 45.25
```

### 하이브리드 (일부 args, 나머지 prompt)

```bash
fsc-sync --ups 47.25
# → DHL, FedEx, OCS는 prompt로 물어봄. OCS는 Enter=skip
```

### Dry-run (미리보기)

```bash
fsc-sync --ups 47.25 --dhl 47.00 --fedex 45.25 --dry-run
```

### 자동 모드 (CI 등)

```bash
fsc-sync --ups 47.25 --dhl 47.00 --fedex 45.25 --yes
```

## 옵션

| 옵션 | 의미 |
|------|------|
| `--ups <pct>` | UPS FSC% |
| `--dhl <pct>` | DHL FSC% |
| `--fedex <pct>` | FedEx FSC% (emax만 적용) |
| `--ocs <pct>` | OCS FSC% (emax만 적용, 보통 생략) |
| `--date <YYYY-MM-DD>` | effective date (기본: 오늘) |
| `--only <name>` | 한 프로젝트만 (`main` 또는 `emax`) |
| `--no-history` | fsc-history.ts entry 추가 안 함 |
| `--force` | fsc-history 동일 date entry 덮어쓰기 |
| `--dry-run` | 미리보기만, 실제 수정 안 함 |
| `--yes`, `-y` | confirm prompt 생략 |
| `--no-push` | commit만, push 생략 |
| `--verbose`, `-v` | 상세 로그 |

## 종료 코드

| 코드 | 의미 |
|------|------|
| 0 | 성공 (또는 dry-run / 사용자 abort) |
| 1 | input validation 오류 |
| 2 | 파일 수정 실패 |
| 3 | git 작업 실패 |
| 130 | Ctrl+C |

## 동작 대상 프로젝트

| 프로젝트 | Path | Carriers |
|----------|------|----------|
| main | `/Users/jaehong/Developer/Projects/smart-quote-main` | UPS, DHL |
| emax | `/Users/jaehong/Developer/Projects/smart-quote-emax` | UPS, DHL, FedEx, OCS |

새 PC에서는 `src/config.ts`의 path만 수정.

## Troubleshooting

### "정규식 매칭 실패" 에러

`rates.ts` 또는 `rates.rb` 형식이 변경되었을 가능성. 도구는 다음 형식을 가정:

- TypeScript: `export const DEFAULT_FSC_PERCENT = 45.5; // UPS default, effective 2026-04-27`
- Ruby: `DEFAULT_FSC_PERCENT = 45.50 # UPS default, effective 2026-04-27`

수동으로 형식 복원하거나 `src/modifiers/ratesTs.ts` 정규식 업데이트.

### "이미 X-X-X entry가 있습니다"

같은 date로 이미 실행됨. `--force`로 덮어쓰기 가능:

```bash
fsc-sync --ups 47.25 --dhl 47.00 --fedex 45.25 --force
```

### git push 실패

네트워크 또는 권한 문제. 도구는 commit까지 완료한 상태로 종료. 수동으로:

```bash
cd ~/Developer/Projects/smart-quote-main && git push origin main
cd ~/Developer/Projects/smart-quote-emax && git push origin main
```

## Spec & Plan

- 설계: [docs/superpowers/specs/2026-05-04-fsc-sync-tool-design.md](https://github.com/jlinsights/smart-quote/blob/main/docs/superpowers/specs/2026-05-04-fsc-sync-tool-design.md)
- 구현 계획: [docs/superpowers/plans/2026-05-04-fsc-sync-tool.md](https://github.com/jlinsights/smart-quote/blob/main/docs/superpowers/plans/2026-05-04-fsc-sync-tool.md)
````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README with install, usage, options, troubleshooting"
```

---

## Task 13: Smoke test (real dry-run)

**No files created.** End-to-end 검증 — 실제 두 프로젝트의 rates.ts 를 dry-run.

- [ ] **Step 1: dry-run 실행**

```bash
fsc-sync --ups 47.25 --dhl 47.00 --fedex 45.25 --dry-run
```

Expected:
- 📊 적용 대상 표시 (main: UPS/DHL, emax: UPS/DHL/FedEx + OCS skip)
- 📝 변경될 파일 (총 8개)
- 📋 [DRY RUN] 메시지로 종료
- exit code 0

- [ ] **Step 2: --only emax dry-run**

```bash
fsc-sync --only emax --ups 47.25 --dry-run
```

Expected:
- emax만 표시
- DHL/FedEx/OCS는 skip 표시
- exit code 0

- [ ] **Step 3: validation error**

```bash
fsc-sync --ups 200 --dry-run
```

Expected:
- 빨간 에러 메시지 "ups: 0 ≤ pct ≤ 100"
- exit code 1

- [ ] **Step 4: 빈 입력 거부**

```bash
fsc-sync --dry-run --yes
```

Expected:
- "적어도 1개 carrier 값을 입력해야 합니다."
- exit code 1

- [ ] **Step 5: 모든 검증 통과 후 final commit (만약 도구 작은 수정 있었다면)**

만약 위 smoke test에서 버그 발견 → 수정 + 단위 테스트 추가 + commit.

문제 없으면 별도 commit 없이 다음 단계로.

- [ ] **Step 6: 마지막 종합 검증 - 모든 테스트 실행**

```bash
cd ~/Developer/Tools/fsc-sync
bun test
```

Expected: 모든 test PASS, coverage 80%+

---

## Self-Review Checklist (이 plan 자체 점검)

다음을 확인:

### 1. Spec coverage

| Spec section | 구현 task |
|--------------|-----------|
| 3. Architecture | Task 0, 1, 2 |
| 4. CLI Interface | Task 9, 10 |
| 5. Execution Flow (10단계) | Task 9 (cli.ts main) |
| 6.1 ratesTs modifier | Task 3 |
| 6.2 ratesRb modifier (Ruby 두자리) | Task 4 |
| 6.3 fscHistory (중복 + force) | Task 5 |
| 6.4 commit message 매트릭스 | Task 6 |
| 7. Error handling Step별 | Task 9 main 함수 try/catch + commitAndPush stage 분기 |
| 8. Testing strategy | Task 2-9 의 TDD 테스트들 + Task 13 smoke |
| 9. install.sh | Task 11 |
| 10. Out of scope | (구현 안 함, OK) |
| 11. CLAUDE.md 정리 | (별도 PR — 이 plan 외) |

### 2. Type consistency

- `updateRatesTs(content, carrier, newValue, newDate)` — Task 3에서 정의, Task 9 cli.ts 의 `applyChanges` 에서 호출. 일치 ✅
- `updateRatesRb` — 동일 시그니처. ✅
- `addHistoryEntry(content, carrier, rate, date, options?)` — Task 5에서 정의, Task 9 cli.ts에서 `{ force }` 옵션 전달. ✅
- `generateCommitMessage(opts)` — Task 6에서 정의, Task 9 cli.ts `buildPlan`에서 호출. opts 형태 일치. ✅
- `commitAndPush(cwd, files, messageFile, { push })` — Task 8에서 정의, Task 9에서 호출. ✅
- `printPlan(plan)` — Task 7에서 정의, Task 9에서 호출. ✅

### 3. Placeholder scan

- 모든 step에 실제 코드 / 명령. "TBD"/"TODO" 없음. ✅
- "Similar to Task N" 표현 없음 — 매 task에 코드 풀로 표시. ✅

### 4. Bite-sized check

- 각 step은 2-5분 단위 (test 작성 / 실행 / impl / 실행 / commit). ✅

---

## Estimated total time

- Task 0-2: 30 분
- Task 3-6 (TDD modifiers): 90 분
- Task 7-9 (orchestration): 60 분
- Task 10-13 (entry, install, README, smoke): 30 분
- **Total: 약 3.5 시간**

## After completion

1. 첫 실제 사용은 다음 주 월요일(2026-05-11) FSC 발표 후
2. 문제 발견 시 issue 또는 직접 수정
3. CLAUDE.md 정리 작업 (spec section 11) 별도 PR로 진행

---

**Plan ready.** 다음 단계: `superpowers:subagent-driven-development` (권장) 또는 `superpowers:executing-plans` 으로 task-by-task 구현.

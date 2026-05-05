# Plan: overseas-partner-markup-rule

> 해외 파트너 (≥20kg 화물) 24% Markup Rule을 Admin UI 통해 등록 및 자동 적용

## 1. 배경 (Why)

### 발견 경위

2026-05-04, 해외 파트너 UPS 견적(Korea→Melbourne) 작성 시 **마진 24%를 수동으로 입력**해야 했음. 운영 정책 명시:

> "해외 파트너의 경우에는 billable WT 20kg 이상은 마진율 24% 적용됩니다."

현재 시스템에는 **이 규칙이 DB에 등록되어 있지 않음**. `MarginRuleResolver`가 매칭 실패 시 `DEFAULT_MARGIN = 24.0` (resolver.rb:4)로 fallback되지만, 이는 **모든 화물에 24%를 적용하는 것**이지 "해외 파트너 + ≥20kg 조건부 24%"가 아님.

### 영향도

- **HIGH**: 운영자 수동 입력 의존 → 휴먼 에러 (마진 누락/오기)
- **HIGH**: 국내 고객도 fallback으로 24% 적용되는 비정상 동작 가능
- **MEDIUM**: 향후 마진 정책 변경 시 DB만 수정으로 즉시 반영 가능 (코드 배포 불필요)

### 정책 정의

| 조건 | 마진율 |
|------|-------|
| 해외 파트너 + billable WT ≥ 20 kg | **24% (Markup)** |
| 해외 파트너 + billable WT < 20 kg | 별도 정의 필요 (운영 확인) |
| 국내 고객 | 별도 정의 필요 (현재 fallback 24% — 정책 적정성 검토) |

## 2. 사전 결정 사항 (Decisions Required)

본 Plan 시작 전 운영 측 확정 필요:

### D-1. "해외 파트너" 정의
- **옵션 A**: User.nationality ≠ "South Korea" / "KR" → 모두 해외 파트너
- **옵션 B**: User에 `partner_type` 필드 추가 (`domestic`, `overseas_partner`, `direct_customer`)
- **옵션 C**: Customer 단위로 분류 (User는 운영자, Customer가 화주)

→ **권장: 옵션 C** (Customer 모델에 partner_type 분류 추가)

### D-2. <20kg 해외 파트너 마진율
- **옵션 A**: <20kg에는 별도 마진율 (예: 30%)
- **옵션 B**: <20kg에는 24% 동일
- **옵션 C**: <20kg에는 fallback (DEFAULT_MARGIN)

### D-3. 국내 고객 기본 마진율
- **현재 fallback**: 24% (의도하지 않은 적용 가능성)
- **권장**: 별도 P0 Rule 등록 (예: 15% 또는 운영 확정값)

## 3. 수정 대상

### Backend (Rails)

#### B-1. Customer 모델 partner_type 컬럼 추가 (옵션 C 채택 시)
- **마이그레이션**: `add_column :customers, :partner_type, :string, default: 'direct'`
- **enum**: `domestic`, `overseas_partner`, `direct_customer`
- **API**: CustomerSerializer에 partner_type 노출

#### B-2. MarginRule에 match_partner_type 추가
- **마이그레이션**: `add_column :margin_rules, :match_partner_type, :string`
- **모델**: validation 추가
- **Resolver**: `matches?` 메서드에 partner_type 체크 추가
- **파일**: `smart-quote-api/app/services/margin_rule_resolver.rb`

```ruby
def matches?(rule, email:, nationality:, weight:, partner_type: nil)
  return false if rule.match_email.present? && rule.match_email != email
  return false if rule.match_nationality.present? && !nationality_matches?(...)
  return false if rule.match_partner_type.present? && rule.match_partner_type != partner_type
  return false if rule.weight_min.present? && weight < rule.weight_min
  return false if rule.weight_max.present? && weight > rule.weight_max
  true
end
```

#### B-3. QuoteCalculator → Resolver 호출에 partner_type 전달
- **파일**: `smart-quote-api/app/services/quote_calculator.rb`
- **변경**: customer.partner_type을 resolver에 전달

#### B-4. DEFAULT_MARGIN 정책 결정
- **옵션 A**: 24.0 그대로 (currentSafeNet)
- **옵션 B**: `MarginRule.find_by(priority: 0, name: 'Default')` 동적 조회
- **권장**: B (DB-driven)

### Frontend (React)

#### F-1. TargetMarginRulesWidget에 partner_type 입력 필드
- **파일**: `src/features/admin/components/TargetMarginRulesWidget.tsx`
- **추가**: Select 옵션 (`domestic`, `overseas_partner`, `direct_customer`, `(any)`)

#### F-2. CustomerManagement에 partner_type 컬럼
- **파일**: `src/features/admin/components/CustomerManagement.tsx`
- **추가**: 신규/수정 폼에 partner_type 선택

#### F-3. QuoteCalculator 자동 마진 표기
- **파일**: `src/features/quote/components/InputSection.tsx`
- **변경**: 마진 입력 필드를 read-only로 (Admin override 토글 시에만 편집 가능)

### Data (Seed)

#### S-1. 해외 파트너 24% Rule 등록
```ruby
MarginRule.create!(
  name: "Overseas Partner ≥20kg",
  rule_type: "weight_based",
  priority: 50,
  margin_percent: 24.0,
  match_partner_type: "overseas_partner",
  weight_min: 20,
  is_active: true
)
```

#### S-2. 정책 미정 case의 Rule도 같이 등록 (D-2/D-3 결정 후)

## 4. 구현 순서 (Decisions 확정 후)

```
1. Decisions D-1, D-2, D-3 확정 (운영 인터뷰)
2. B-1 (Customer.partner_type 마이그레이션)
3. B-2 (MarginRule.match_partner_type 마이그레이션 + Resolver 수정)
4. B-3 (QuoteCalculator 통합)
5. F-2 (CustomerManagement UI — partner_type 입력)
6. 기존 Customer 데이터 마이그레이션 (관리자 분류)
7. F-1 (TargetMarginRulesWidget UI — partner_type 필터)
8. S-1 (해외 파트너 24% Rule seed)
9. F-3 (QuoteCalculator 마진 자동 표기)
10. B-4 (DEFAULT_MARGIN DB-driven 전환)
11. 통합 테스트 + USER_GUIDE 업데이트
```

## 5. 비대상 (Out of Scope)

- ❌ Markup vs Margin Rate 공식 변경 (별 Plan: margin-formula-clarification)
- ❌ Packing dimensions 관련 (별 Plan: packing-dimensions-verification)
- ❌ FSC Rate 자동화 (이미 별도 도구 fsc-sync 존재)

## 6. 검증

### 단위 테스트
- `spec/services/margin_rule_resolver_spec.rb` 확장
- partner_type 매칭 case 추가 (domestic, overseas_partner, both, neither)

### 통합 시나리오
1. 해외 파트너 + 25kg → 24% 자동 적용 ✓
2. 해외 파트너 + 15kg → fallback 또는 별 Rule 적용 ✓
3. 국내 고객 + 25kg → 별 Rule 적용 (24% 아님) ✓
4. Admin override → 자동 마진 무시하고 입력값 우선 ✓

### 실 견적 재현
- 본 PDCA 진입 직전 시나리오 (UPS ICN→MEL 43kg, 해외 파트너) 입력 시
- 자동 24% 적용 + ₩829,500 동일 출력 확인

## 7. 위험 (Risks)

| 위험 | 가능성 | 영향 | 대응 |
|------|-------|------|------|
| 기존 Customer 데이터의 partner_type 분류 누락 | 고 | 중 | 마이그레이션 시 default='direct' + 운영 일괄 분류 작업 |
| Resolver 캐시(5분 TTL) 인한 신규 Rule 즉시 미반영 | 중 | 저 | Admin Save 시 cache invalidate |
| Margin 자동화 후 운영자 수동 override 거부감 | 중 | 저 | F-3에 토글 명확화 + USER_GUIDE 안내 |
| <20kg case 정책 미정 시 fallback 24% 그대로 | 고 | 중 | D-2 결정 전에는 본 Plan 시작 X |

## 8. 후속 작업

- D-1, D-2, D-3 결정 후 → `/pdca design overseas-partner-markup-rule`
- 의존성: `margin-formula-clarification` 선행 권장 (공식 명확화 후 정책 적용)

---

**작성일**: 2026-05-04
**작성자**: Claude Code (사용자 의뢰)
**우선순위**: HIGH
**예상 소요**: Discovery 2시간 + 구현 8-12시간 (mig + Resolver + UI 2개)
**관련 이슈**: 해외 파트너 견적 #1 (UPS ICN→MEL Z4) — 마진 수동 입력 의존
**의존성**: `margin-formula-clarification` 선행 권장

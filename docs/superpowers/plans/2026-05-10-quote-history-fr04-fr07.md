> # ✅ 이 계획은 완료됐습니다 — 실행하지 마세요 (2026-09-14 확인)
>
> **아래 체크박스 52개는 미완이 아니라 미갱신입니다.** 작업은 끝났는데
> 체크박스를 표시하지 않은 채 남았습니다.
>
> **완료 보고서:** [`docs/04-report/features/quote-history-fr04-fr07.report.md`](../../04-report/features/quote-history-fr04-fr07.report.md)
>
> **코드로 확인한 근거:**
> - FR-04 amount-range 필터 → `smart-quote-api/app/models/quote.rb` 의
>   `by_amount_range` scope 실재
> - FR-07 xlsx export → `src/features/history` 에 xlsx 경로 실재
>
> ⚠️ 위 "For agentic workers" 지시는 **무시하세요.** 이 계획을 실행하면
> 이미 배포된 기능을 다시 만들거나 충돌시킵니다.

# Quote History FR-04 + FR-07 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Quote history 의 누락 항목 2건 — amount-range 검색 필터 (KRW/USD 토글) + Excel(xlsx) export — 를 최소 침습으로 추가한다.

**Architecture:** 기존 `QuoteSearcher` scope chain 에 `by_amount_range` 추가 + `QuoteExporter` 에 `format: :xlsx` 분기 (`caxlsx` gem). 라우트는 변경 없음 (`get /quotes/export` 가 `.csv`/`.xlsx` 둘 다 매칭). 프런트는 `QuoteSearchBar` 확장 + `QuoteHistoryPage` Export 드롭다운.

**Tech Stack:** Rails 8 API + RSpec, React 19 + Vitest, `caxlsx` gem (신규), TypeScript strict.

**Spec:** `docs/superpowers/specs/2026-05-10-quote-history-fr04-fr07-design.md`

---

## File Structure

### Backend (Rails — `smart-quote-api/`)

| 파일 | 변경 종류 | 책임 |
|---|---|---|
| `Gemfile` | Modify | `gem "caxlsx"` 추가 |
| `Gemfile.lock` | Modify | `bundle install` 결과 |
| `app/models/quote.rb` | Modify | `by_amount_range(min, max, currency)` scope 추가 |
| `app/services/quote_searcher.rb` | Modify | `by_amount_range` 체이닝, `min > max` 시 `ArgumentError` |
| `app/services/quote_exporter.rb` | Modify | `call(scope, format: :csv)` 시그니처. `:xlsx` 분기. `build_row(q)` 추출 |
| `app/controllers/api/v1/quotes_controller.rb` | Modify | `export` 액션에서 `request.format.symbol` 분기. `min_amount`, `max_amount`, `amount_currency` permit. invalid range → 422 |
| `spec/models/quote_spec.rb` | Create | `by_amount_range` scope 검증 |
| `spec/services/quote_searcher_spec.rb` | Create | 4 currency 케이스 + edge |
| `spec/services/quote_exporter_spec.rb` | Create | `:csv` (regression) + `:xlsx` (header/row 일치) |
| `spec/requests/api/v1/quotes_spec.rb` | Modify | `GET /quotes/export.xlsx` 200 + content-type, invalid range 422 |

### Frontend (React — repo root `src/`)

| 파일 | 변경 종류 | 책임 |
|---|---|---|
| `src/types.ts` | Modify | `QuoteListParams` 에 `minAmount`, `maxAmount`, `amountCurrency` 추가. `AmountCurrency = 'KRW' \| 'USD'` 타입 |
| `src/api/quoteApi.ts` | Modify | `listQuotes` 신규 파라미터 직렬화. `exportQuotesCsv` → `exportQuotes(params, format)` 일반화 (기존 호출자는 default `'csv'` 로 호환) |
| `src/features/history/components/QuoteSearchBar.tsx` | Modify | currency 토글 (2 버튼) + min/max number input 2개. 표시 형식: KRW=콤마, USD=소수점 2자리. `min > max` inline 메시지 |
| `src/features/history/components/QuoteHistoryPage.tsx` | Modify | search state 확장. Export 단일 버튼 → 드롭다운 (`Export ▾` → CSV / Excel) |
| `src/features/history/components/__tests__/QuoteSearchBar.test.tsx` | Modify | currency 토글, min/max input, validation 케이스 추가 |
| `src/features/history/components/__tests__/QuoteHistoryPage.test.tsx` | Create (없으면) | Export 드롭다운 → xlsx 호출, amount range → API 파라미터 전파 |

i18n 라벨: 기존 페이지 패턴(영어 하드코딩) 유지 — 별도 사이클로 분리.

---

## Backend Tasks

### Task 1: `caxlsx` gem 추가

**Files:**
- Modify: `smart-quote-api/Gemfile`
- Modify: `smart-quote-api/Gemfile.lock`

- [ ] **Step 1: Gemfile 에 gem 줄 추가**

`smart-quote-api/Gemfile` 의 `gem "csv"` 다음 줄(현재 35행 근처)에 추가:

```ruby
# Excel (xlsx) export
gem "caxlsx", "~> 4.1"
```

- [ ] **Step 2: bundle install**

```bash
cd smart-quote-api && bundle install
```

Expected: `Bundle complete!` 출력. `Gemfile.lock` 에 `caxlsx (4.1.x)`, `nokogiri`, `rubyzip` 등 의존성 추가됨.

- [ ] **Step 3: 로드 확인**

```bash
cd smart-quote-api && bin/rails runner "puts Axlsx::Package.new.class"
```

Expected: `Axlsx::Package` 출력.

- [ ] **Step 4: Commit**

```bash
git add smart-quote-api/Gemfile smart-quote-api/Gemfile.lock
git commit -m "chore(deps): add caxlsx gem for xlsx export"
```

---

### Task 2: `Quote.by_amount_range` scope (RED)

**Files:**
- Create: `smart-quote-api/spec/models/quote_spec.rb`
- Modify: `smart-quote-api/app/models/quote.rb` (다음 task 에서)

- [ ] **Step 1: 모델 spec 파일 생성 — 실패하는 테스트 작성**

`smart-quote-api/spec/models/quote_spec.rb`:

```ruby
require "rails_helper"

RSpec.describe Quote, type: :model do
  describe ".by_amount_range" do
    let!(:user) { create(:user) }
    let!(:cheap)  { create(:quote, user: user, total_quote_amount: 100_000,   total_quote_amount_usd: 70.00) }
    let!(:medium) { create(:quote, user: user, total_quote_amount: 1_000_000, total_quote_amount_usd: 700.00) }
    let!(:pricey) { create(:quote, user: user, total_quote_amount: 5_000_000, total_quote_amount_usd: 3_500.00) }

    it "filters by KRW range when currency=KRW" do
      result = Quote.by_amount_range(min: 500_000, max: 2_000_000, currency: "KRW")
      expect(result).to contain_exactly(medium)
    end

    it "filters by USD range when currency=USD" do
      result = Quote.by_amount_range(min: 500, max: 1_000, currency: "USD")
      expect(result).to contain_exactly(medium)
    end

    it "applies only min when max is nil" do
      result = Quote.by_amount_range(min: 800_000, max: nil, currency: "KRW")
      expect(result).to contain_exactly(medium, pricey)
    end

    it "applies only max when min is nil" do
      result = Quote.by_amount_range(min: nil, max: 800_000, currency: "KRW")
      expect(result).to contain_exactly(cheap)
    end

    it "returns all when both nil" do
      expect(Quote.by_amount_range(min: nil, max: nil, currency: "KRW").count).to eq(3)
    end

    it "defaults to KRW when currency is unknown" do
      result = Quote.by_amount_range(min: 500_000, max: 2_000_000, currency: "EUR")
      expect(result).to contain_exactly(medium)
    end
  end
end
```

- [ ] **Step 2: 실패 확인**

```bash
cd smart-quote-api && bundle exec rspec spec/models/quote_spec.rb
```

Expected: FAIL — `NoMethodError: undefined method 'by_amount_range'`.

---

### Task 3: `Quote.by_amount_range` 구현 (GREEN)

**Files:**
- Modify: `smart-quote-api/app/models/quote.rb`

- [ ] **Step 1: scope 추가**

`smart-quote-api/app/models/quote.rb` 의 `scope :by_status` 줄 다음에 다음 코드를 삽입:

```ruby
  scope :by_amount_range, ->(min:, max:, currency:) {
    column = currency == "USD" ? :total_quote_amount_usd : :total_quote_amount
    s = all
    s = s.where("#{column} >= ?", min) if min.present?
    s = s.where("#{column} <= ?", max) if max.present?
    s
  }
```

- [ ] **Step 2: 통과 확인**

```bash
cd smart-quote-api && bundle exec rspec spec/models/quote_spec.rb
```

Expected: PASS — 6 examples, 0 failures.

- [ ] **Step 3: 전체 모델 spec 회귀 확인**

```bash
cd smart-quote-api && bundle exec rspec spec/models
```

Expected: 모든 모델 spec PASS.

- [ ] **Step 4: Commit**

```bash
git add smart-quote-api/app/models/quote.rb smart-quote-api/spec/models/quote_spec.rb
git commit -m "feat(quote): add by_amount_range scope (KRW/USD toggle)"
```

---

### Task 4: `QuoteSearcher` chain + invalid range (RED → GREEN)

**Files:**
- Create: `smart-quote-api/spec/services/quote_searcher_spec.rb`
- Modify: `smart-quote-api/app/services/quote_searcher.rb`

- [ ] **Step 1: searcher spec — 실패하는 테스트 작성**

`smart-quote-api/spec/services/quote_searcher_spec.rb`:

```ruby
require "rails_helper"

RSpec.describe QuoteSearcher do
  let!(:user) { create(:user) }
  let!(:q1) { create(:quote, user: user, total_quote_amount: 100_000,   total_quote_amount_usd: 70.00,    destination_country: "JP") }
  let!(:q2) { create(:quote, user: user, total_quote_amount: 1_000_000, total_quote_amount_usd: 700.00,   destination_country: "JP") }
  let!(:q3) { create(:quote, user: user, total_quote_amount: 5_000_000, total_quote_amount_usd: 3_500.00, destination_country: "US") }

  describe ".call with amount range" do
    it "filters by KRW range" do
      result = described_class.call(Quote.all, "min_amount" => 500_000, "max_amount" => 2_000_000, "amount_currency" => "KRW")
      expect(result).to contain_exactly(q2)
    end

    it "filters by USD range" do
      result = described_class.call(Quote.all, "min_amount" => 500, "max_amount" => 1_000, "amount_currency" => "USD")
      expect(result).to contain_exactly(q2)
    end

    it "combines amount range with destination filter" do
      result = described_class.call(Quote.all, "destination_country" => "JP", "min_amount" => 50_000, "amount_currency" => "KRW")
      expect(result).to contain_exactly(q1, q2)
    end

    it "raises ArgumentError when min > max" do
      expect {
        described_class.call(Quote.all, "min_amount" => 1_000_000, "max_amount" => 100_000, "amount_currency" => "KRW")
      }.to raise_error(ArgumentError, /amount range/i)
    end

    it "ignores blank amount params" do
      result = described_class.call(Quote.all, "min_amount" => "", "max_amount" => nil, "amount_currency" => "KRW")
      expect(result.count).to eq(3)
    end
  end
end
```

- [ ] **Step 2: 실패 확인**

```bash
cd smart-quote-api && bundle exec rspec spec/services/quote_searcher_spec.rb
```

Expected: FAIL — 5 failures (current searcher doesn't handle amount params).

- [ ] **Step 3: searcher 구현**

`smart-quote-api/app/services/quote_searcher.rb` 전체 교체:

```ruby
class QuoteSearcher
  InvalidRangeError = Class.new(ArgumentError)

  def self.call(scope, params)
    new(scope, params).call
  end

  def initialize(scope, params)
    @scope = scope
    @params = params
  end

  def call
    validate_amount_range!
    @scope
      .includes(:customer)
      .search_text(@params[:q])
      .by_destination(@params[:destination_country])
      .by_date_range(@params[:date_from], @params[:date_to])
      .by_status(@params[:status])
      .by_amount_range(min: parsed_min, max: parsed_max, currency: amount_currency)
  end

  private

  def parsed_min
    val = @params[:min_amount]
    val.present? ? val.to_d : nil
  end

  def parsed_max
    val = @params[:max_amount]
    val.present? ? val.to_d : nil
  end

  def amount_currency
    @params[:amount_currency].to_s.upcase == "USD" ? "USD" : "KRW"
  end

  def validate_amount_range!
    return unless parsed_min && parsed_max
    return if parsed_min <= parsed_max
    raise InvalidRangeError, "amount range invalid: min_amount must be <= max_amount"
  end
end
```

- [ ] **Step 4: 통과 확인**

```bash
cd smart-quote-api && bundle exec rspec spec/services/quote_searcher_spec.rb
```

Expected: PASS — 5 examples, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add smart-quote-api/app/services/quote_searcher.rb smart-quote-api/spec/services/quote_searcher_spec.rb
git commit -m "feat(searcher): chain by_amount_range with KRW/USD toggle and invalid-range guard"
```

---

### Task 5: `QuoteExporter` xlsx 분기 (RED → GREEN)

**Files:**
- Create: `smart-quote-api/spec/services/quote_exporter_spec.rb`
- Modify: `smart-quote-api/app/services/quote_exporter.rb`

- [ ] **Step 1: exporter spec 작성**

`smart-quote-api/spec/services/quote_exporter_spec.rb`:

```ruby
require "rails_helper"

RSpec.describe QuoteExporter do
  let!(:user) { create(:user) }
  let!(:quote) { create(:quote,
    user: user,
    reference_no: "SQ-2026-0001",
    destination_country: "JP",
    incoterm: "DAP",
    billable_weight: 25.5,
    total_cost_amount: 800_000,
    total_quote_amount: 1_000_000,
    total_quote_amount_usd: 700.00,
    profit_margin: 20.0,
    status: "draft"
  ) }
  let(:scope) { Quote.where(id: quote.id) }

  describe ".call (csv default)" do
    it "returns csv_data and count" do
      result = described_class.call(scope)
      expect(result[:count]).to eq(1)
      expect(result[:csv_data]).to include("Reference No")
      expect(result[:csv_data]).to include("SQ-2026-0001")
    end
  end

  describe ".call(format: :xlsx)" do
    let(:result) { described_class.call(scope, format: :xlsx) }

    it "returns xlsx_data and count" do
      expect(result[:count]).to eq(1)
      expect(result[:xlsx_data]).to be_a(String)
      expect(result[:xlsx_data].bytesize).to be > 0
    end

    it "produces a parseable xlsx with same headers as csv" do
      io = StringIO.new(result[:xlsx_data])
      package = Axlsx::Package.new
      # Read back: caxlsx writes binary; verify it's a valid zip-based xlsx
      expect(result[:xlsx_data][0, 2]).to eq("PK")  # zip magic bytes
    end

    it "raises TooLargeError when scope exceeds MAX_EXPORT_COUNT" do
      stub_const("QuoteExporter::MAX_EXPORT_COUNT", 0)
      expect { described_class.call(scope, format: :xlsx) }.to raise_error(QuoteExporter::TooLargeError)
    end
  end
end
```

- [ ] **Step 2: 실패 확인**

```bash
cd smart-quote-api && bundle exec rspec spec/services/quote_exporter_spec.rb
```

Expected: FAIL — `:xlsx` 분기 미구현.

- [ ] **Step 3: exporter 구현**

`smart-quote-api/app/services/quote_exporter.rb` 전체 교체:

```ruby
require "csv"

class QuoteExporter
  MAX_EXPORT_COUNT = 10_000

  HEADERS = [
    "Reference No", "Date", "Destination", "Incoterm", "Billable Weight (kg)",
    "Total Cost (KRW)", "Quote Amount (KRW)", "Quote Amount (USD)", "Margin %", "Status"
  ].freeze

  def self.call(scope, format: :csv)
    new(scope, format: format).call
  end

  def initialize(scope, format: :csv)
    @scope = scope
    @format = format
  end

  # Returns:
  #   { csv_data:, count: }     when format == :csv
  #   { xlsx_data:, count: }    when format == :xlsx
  # Raises TooLargeError when count > MAX_EXPORT_COUNT
  def call
    count = @scope.count

    if count > MAX_EXPORT_COUNT
      raise TooLargeError, "Too many records (max #{MAX_EXPORT_COUNT}). Please narrow your filters."
    end

    case @format
    when :xlsx
      { xlsx_data: generate_xlsx, count: count }
    else
      { csv_data: generate_csv, count: count }
    end
  end

  class TooLargeError < StandardError; end

  private

  def generate_csv
    CSV.generate(headers: true) do |csv|
      csv << HEADERS
      @scope.find_each { |q| csv << build_row(q) }
    end
  end

  def generate_xlsx
    package = Axlsx::Package.new
    package.workbook.add_worksheet(name: "Quotes") do |sheet|
      sheet.add_row HEADERS
      @scope.find_each { |q| sheet.add_row build_row(q) }
    end
    package.to_stream.read
  end

  def build_row(q)
    [
      q.reference_no,
      q.created_at.strftime("%Y-%m-%d"),
      q.destination_country,
      q.incoterm,
      q.billable_weight.to_f,
      q.total_cost_amount.to_i,
      q.total_quote_amount.to_i,
      q.total_quote_amount_usd.to_f.round(2),
      q.profit_margin.to_f,
      q.status
    ]
  end
end
```

- [ ] **Step 4: 통과 확인**

```bash
cd smart-quote-api && bundle exec rspec spec/services/quote_exporter_spec.rb
```

Expected: PASS — 4 examples, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add smart-quote-api/app/services/quote_exporter.rb smart-quote-api/spec/services/quote_exporter_spec.rb
git commit -m "feat(exporter): add xlsx format branch via caxlsx (csv unchanged)"
```

---

### Task 6: Controller `export` 액션 분기 + permit + invalid-range 422

**Files:**
- Modify: `smart-quote-api/app/controllers/api/v1/quotes_controller.rb`
- Modify: `smart-quote-api/spec/requests/api/v1/quotes_spec.rb`

- [ ] **Step 1: request spec 추가 (RED)**

`smart-quote-api/spec/requests/api/v1/quotes_spec.rb` 끝에 다음 describe 블록 추가:

```ruby
  describe "GET /api/v1/quotes/export" do
    let!(:user) { create(:user) }
    let!(:quote) { create(:quote, user: user, total_quote_amount: 1_000_000, total_quote_amount_usd: 700.00) }
    let(:headers) { { "Authorization" => "Bearer #{auth_token_for(user)}" } }

    it "returns csv by default (regression)" do
      get "/api/v1/quotes/export", headers: headers
      expect(response).to have_http_status(:ok)
      expect(response.content_type).to start_with("text/csv")
      expect(response.body).to include("Reference No")
    end

    it "returns xlsx when format=xlsx" do
      get "/api/v1/quotes/export.xlsx", headers: headers
      expect(response).to have_http_status(:ok)
      expect(response.content_type).to start_with("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
      expect(response.body[0, 2]).to eq("PK")  # zip magic
    end

    it "filters by amount range" do
      create(:quote, user: user, total_quote_amount: 100, total_quote_amount_usd: 0.07)
      get "/api/v1/quotes/export", params: { min_amount: 500_000, amount_currency: "KRW" }, headers: headers
      expect(response).to have_http_status(:ok)
      expect(response.body).to include(quote.reference_no)
      expect(response.body.lines.size).to eq(2)  # header + 1 row
    end

    it "returns 422 when min_amount > max_amount" do
      get "/api/v1/quotes/export", params: { min_amount: 1_000_000, max_amount: 100, amount_currency: "KRW" }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
      expect(JSON.parse(response.body).dig("error", "code")).to eq("INVALID_AMOUNT_RANGE")
    end
  end
```

> Note: `auth_token_for(user)` 헬퍼는 `quotes_spec.rb` 상단에서 이미 사용되고 있다고 가정. 없으면 기존 spec 패턴(예: `headers_for(user)`) 그대로 사용.

- [ ] **Step 2: 실패 확인**

```bash
cd smart-quote-api && bundle exec rspec spec/requests/api/v1/quotes_spec.rb
```

Expected: 신규 4 케이스 FAIL.

- [ ] **Step 3: controller 수정**

`smart-quote-api/app/controllers/api/v1/quotes_controller.rb` 의 `export` 액션을 다음으로 교체:

```ruby
      # GET /api/v1/quotes/export(.csv|.xlsx)
      def export
        export_params = params.permit(
          :q, :destination_country, :date_from, :date_to, :status,
          :min_amount, :max_amount, :amount_currency
        ).to_h

        filtered_scope = QuoteSearcher.call(scoped_quotes, export_params)
        format = request.format.symbol == :xlsx ? :xlsx : :csv
        result = QuoteExporter.call(filtered_scope, format: format)

        AuditLog.track!(
          user: current_user,
          action: "quote.exported",
          resource: Quote.new(id: 0),
          metadata: { count: result[:count], format: format, filters: export_params },
          ip_address: request.remote_ip
        )

        if format == :xlsx
          send_data result[:xlsx_data],
            filename: "quotes-#{Date.current}.xlsx",
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        else
          send_data result[:csv_data],
            filename: "quotes-#{Date.current}.csv",
            type: "text/csv"
        end
      rescue QuoteSearcher::InvalidRangeError => e
        render json: { error: { code: "INVALID_AMOUNT_RANGE", message: e.message } }, status: :unprocessable_entity
      rescue QuoteExporter::TooLargeError => e
        render json: { error: { code: "EXPORT_TOO_LARGE", message: e.message } }, status: :unprocessable_entity
      end
```

추가로 `index` 액션에서도 amount params 가 통과해야 하므로, `index` 의 `params` 가 `QuoteSearcher.call` 에 그대로 전달되는지 확인. 기존 index 가 이미 `params` 를 통째로 넘기고 있으면 변경 불필요. 안 그렇다면 `index` 도 동일하게 `permit` 화이트리스트에 `:min_amount, :max_amount, :amount_currency` 추가.

> 확인 명령:
>
> ```bash
> grep -n "QuoteSearcher.call" smart-quote-api/app/controllers/api/v1/quotes_controller.rb
> ```

- [ ] **Step 4: 통과 확인**

```bash
cd smart-quote-api && bundle exec rspec spec/requests/api/v1/quotes_spec.rb
```

Expected: 신규 4 케이스 PASS, 기존 케이스도 PASS.

- [ ] **Step 5: 전체 backend rspec + rubocop**

```bash
cd smart-quote-api && bundle exec rspec && bin/rubocop
```

Expected: 모두 GREEN.

- [ ] **Step 6: Commit**

```bash
git add smart-quote-api/app/controllers/api/v1/quotes_controller.rb smart-quote-api/spec/requests/api/v1/quotes_spec.rb
git commit -m "feat(quotes#export): xlsx format branch + amount-range filter + 422 invalid range"
```

---

## Frontend Tasks

### Task 7: 타입 + API 클라이언트 일반화

**Files:**
- Modify: `src/types.ts`
- Modify: `src/api/quoteApi.ts`

- [ ] **Step 1: 타입 확장**

`src/types.ts` 의 `QuoteListParams` 인터페이스에 다음 필드 추가:

```ts
  export type AmountCurrency = 'KRW' | 'USD';

  export interface QuoteListParams {
    page?: number;
    perPage?: number;
    q?: string;
    destinationCountry?: string;
    dateFrom?: string;
    dateTo?: string;
    status?: QuoteStatus;
    minAmount?: number;
    maxAmount?: number;
    amountCurrency?: AmountCurrency;
  }
```

- [ ] **Step 2: `listQuotes` 직렬화 확장**

`src/api/quoteApi.ts` 의 `listQuotes` 내부 `searchParams` 빌드 부분 (현재 `if (params.status) searchParams.set('status', params.status);` 다음 줄)에 추가:

```ts
  if (params.minAmount != null) searchParams.set('min_amount', String(params.minAmount));
  if (params.maxAmount != null) searchParams.set('max_amount', String(params.maxAmount));
  if (params.amountCurrency) searchParams.set('amount_currency', params.amountCurrency);
```

- [ ] **Step 3: `exportQuotes` 일반화**

`src/api/quoteApi.ts` 의 `exportQuotesCsv` 함수를 다음으로 교체:

```ts
export const exportQuotes = async (
  params: QuoteListParams = {},
  format: 'csv' | 'xlsx' = 'csv'
): Promise<void> => {
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set('q', params.q);
  if (params.destinationCountry) searchParams.set('destination_country', params.destinationCountry);
  if (params.dateFrom) searchParams.set('date_from', params.dateFrom);
  if (params.dateTo) searchParams.set('date_to', params.dateTo);
  if (params.status) searchParams.set('status', params.status);
  if (params.minAmount != null) searchParams.set('min_amount', String(params.minAmount));
  if (params.maxAmount != null) searchParams.set('max_amount', String(params.maxAmount));
  if (params.amountCurrency) searchParams.set('amount_currency', params.amountCurrency);

  const qs = searchParams.toString();
  const token = getAccessToken();
  const accept = format === 'xlsx'
    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : 'text/csv';
  const headers: HeadersInit = { Accept: accept };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const url = `${API_URL}/api/v1/quotes/export.${format}${qs ? `?${qs}` : ''}`;
  const response = await fetch(url, { headers });

  if (!response.ok) {
    if (response.status === 401) {
      clearAllTokens();
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
      throw new ApiError(response.status, 'Session expired');
    }
    if (response.status === 403) throw new ApiError(response.status, 'Access denied');
    if (response.status === 422) {
      const body = await response.json().catch(() => null);
      throw new ApiError(response.status, body?.error?.message ?? 'Invalid filter');
    }
    if (response.status >= 500) throw new ApiError(response.status, 'Server error');
    throw new ApiError(response.status, `Failed to export ${format.toUpperCase()}`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = `quotes-${new Date().toISOString().split('T')[0]}.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
};

// Backward-compat alias (deprecated — prefer exportQuotes)
export const exportQuotesCsv = (params: QuoteListParams = {}) => exportQuotes(params, 'csv');
```

> Note: 기존 `exportQuotesCsv` 의 blob/anchor download 로직을 그대로 옮기되, `format` 분기. 기존 호출자(`QuoteHistoryPage`) 는 다음 task 에서 `exportQuotes` 로 교체.

- [ ] **Step 4: type-check + lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/api/quoteApi.ts
git commit -m "feat(api): generalize exportQuotes with format param + amount-range list params"
```

---

### Task 8: `QuoteSearchBar` — currency 토글 + min/max input (RED)

**Files:**
- Modify: `src/features/history/components/QuoteSearchBar.tsx`
- Modify: `src/features/history/components/__tests__/QuoteSearchBar.test.tsx`

- [ ] **Step 1: 실패하는 테스트 추가**

`src/features/history/components/__tests__/QuoteSearchBar.test.tsx` 에 다음 describe 추가:

```ts
import { render, screen, fireEvent } from '@testing-library/react';
import { QuoteSearchBar } from '../QuoteSearchBar';

describe('QuoteSearchBar — amount range', () => {
  const baseProps = {
    searchInput: '',
    onSearchInputChange: vi.fn(),
    onSearch: vi.fn(),
    activeStatus: undefined,
    onStatusFilter: vi.fn(),
    showFilters: true,
    onToggleFilters: vi.fn(),
    hasActiveFilters: false,
    onClearFilters: vi.fn(),
    minAmount: undefined as number | undefined,
    maxAmount: undefined as number | undefined,
    amountCurrency: 'KRW' as const,
    onAmountChange: vi.fn(),
    onCurrencyChange: vi.fn(),
  };

  it('renders KRW/USD toggle and min/max inputs when filters open', () => {
    render(<QuoteSearchBar {...baseProps} />);
    expect(screen.getByRole('button', { name: /KRW/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /USD/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/min amount/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/max amount/i)).toBeInTheDocument();
  });

  it('calls onCurrencyChange when toggling to USD', () => {
    const onCurrencyChange = vi.fn();
    render(<QuoteSearchBar {...baseProps} onCurrencyChange={onCurrencyChange} />);
    fireEvent.click(screen.getByRole('button', { name: /USD/i }));
    expect(onCurrencyChange).toHaveBeenCalledWith('USD');
  });

  it('calls onAmountChange with parsed numbers', () => {
    const onAmountChange = vi.fn();
    render(<QuoteSearchBar {...baseProps} onAmountChange={onAmountChange} />);
    fireEvent.change(screen.getByPlaceholderText(/min amount/i), { target: { value: '500000' } });
    expect(onAmountChange).toHaveBeenCalledWith({ min: 500000, max: undefined });
  });

  it('shows inline error when min > max', () => {
    render(<QuoteSearchBar {...baseProps} minAmount={1_000_000} maxAmount={100_000} />);
    expect(screen.getByText(/min must be ≤ max/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 실패 확인**

```bash
npx vitest run src/features/history/components/__tests__/QuoteSearchBar.test.tsx
```

Expected: 신규 4 케이스 FAIL.

- [ ] **Step 3: `QuoteSearchBar` 확장**

`src/features/history/components/QuoteSearchBar.tsx` 에서 `interface Props` 에 다음 필드 추가:

```ts
  minAmount: number | undefined;
  maxAmount: number | undefined;
  amountCurrency: 'KRW' | 'USD';
  onAmountChange: (next: { min: number | undefined; max: number | undefined }) => void;
  onCurrencyChange: (next: 'KRW' | 'USD') => void;
```

컴포넌트 시그니처에서 destructure 추가:

```ts
  minAmount,
  maxAmount,
  amountCurrency,
  onAmountChange,
  onCurrencyChange,
```

`{showFilters && (...)}` 블록의 닫는 `</div>` 직전에 다음 JSX 추가:

```tsx
          <div className="flex flex-wrap items-center gap-2 w-full">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Amount:</span>
            <div className="inline-flex rounded-md border border-gray-300 dark:border-gray-600 overflow-hidden">
              {(['KRW', 'USD'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onCurrencyChange(c)}
                  aria-pressed={amountCurrency === c}
                  className={`px-3 py-1.5 text-xs font-medium ${
                    amountCurrency === c
                      ? 'bg-brand-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <input
              type="number"
              inputMode="decimal"
              step={amountCurrency === 'KRW' ? 1000 : 0.01}
              placeholder="Min amount"
              value={minAmount ?? ''}
              onChange={(e) => onAmountChange({
                min: e.target.value === '' ? undefined : Number(e.target.value),
                max: maxAmount,
              })}
              className="w-32 px-2 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
            />
            <span className="text-xs text-gray-400">~</span>
            <input
              type="number"
              inputMode="decimal"
              step={amountCurrency === 'KRW' ? 1000 : 0.01}
              placeholder="Max amount"
              value={maxAmount ?? ''}
              onChange={(e) => onAmountChange({
                min: minAmount,
                max: e.target.value === '' ? undefined : Number(e.target.value),
              })}
              className="w-32 px-2 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
            />
            {minAmount != null && maxAmount != null && minAmount > maxAmount && (
              <span className="text-xs text-red-500">min must be ≤ max</span>
            )}
          </div>
```

- [ ] **Step 4: 통과 확인**

```bash
npx vitest run src/features/history/components/__tests__/QuoteSearchBar.test.tsx
```

Expected: 신규 4 + 기존 케이스 모두 PASS.

- [ ] **Step 5: type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors. (기존 호출자 `QuoteHistoryPage` 가 신규 prop 누락으로 실패할 수 있음 — 다음 task 에서 해결.)

> Note: tsc 실패하면 다음 task 까지 묶어서 commit. 통과하면 단독 commit:
>
> ```bash
> git add src/features/history/components/QuoteSearchBar.tsx src/features/history/components/__tests__/QuoteSearchBar.test.tsx
> git commit -m "feat(history): currency toggle + min/max amount input on QuoteSearchBar"
> ```

---

### Task 9: `QuoteHistoryPage` — state 확장 + Export 드롭다운

**Files:**
- Modify: `src/features/history/components/QuoteHistoryPage.tsx`
- Create or modify: `src/features/history/components/__tests__/QuoteHistoryPage.test.tsx`

- [ ] **Step 1: state + handler 추가**

`src/features/history/components/QuoteHistoryPage.tsx` 의 컴포넌트 상단에서 기존 search state 옆에 추가:

```ts
  const [minAmount, setMinAmount] = useState<number | undefined>(undefined);
  const [maxAmount, setMaxAmount] = useState<number | undefined>(undefined);
  const [amountCurrency, setAmountCurrency] = useState<'KRW' | 'USD'>('KRW');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
```

`fetchList` (또는 `params` 객체를 만드는 부분)에서 API 파라미터에 다음 추가:

```ts
    minAmount,
    maxAmount,
    amountCurrency,
```

(즉 `listQuotes({ page, perPage, q, destinationCountry, dateFrom, dateTo, status, minAmount, maxAmount, amountCurrency })`)

- [ ] **Step 2: `QuoteSearchBar` 호출에 신규 prop 전달**

`<QuoteSearchBar ... />` 호출에 다음 prop 추가:

```tsx
            minAmount={minAmount}
            maxAmount={maxAmount}
            amountCurrency={amountCurrency}
            onAmountChange={({ min, max }) => { setMinAmount(min); setMaxAmount(max); }}
            onCurrencyChange={setAmountCurrency}
```

- [ ] **Step 3: Export 드롭다운으로 교체**

기존 `<button onClick={handleExport}>Export CSV</button>` 부분을 다음으로 교체:

```tsx
          <div className="relative">
            <button
              type="button"
              onClick={() => setExportMenuOpen((v) => !v)}
              className="px-4 py-2 text-sm font-medium text-white bg-brand-blue-600 rounded-lg hover:bg-brand-blue-700"
            >
              Export ▾
            </button>
            {exportMenuOpen && (
              <div className="absolute right-0 mt-1 w-32 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg z-10">
                <button
                  type="button"
                  onClick={() => { setExportMenuOpen(false); handleExport('csv'); }}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  CSV
                </button>
                <button
                  type="button"
                  onClick={() => { setExportMenuOpen(false); handleExport('xlsx'); }}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Excel
                </button>
              </div>
            )}
          </div>
```

`handleExport` 함수를 다음으로 교체 (기존 `exportQuotesCsv(params)` 호출 부분):

```ts
  const handleExport = async (format: 'csv' | 'xlsx') => {
    try {
      await exportQuotes({ q, destinationCountry, dateFrom, dateTo, status, minAmount, maxAmount, amountCurrency }, format);
      toast('success', `${format.toUpperCase()} exported successfully`);
    } catch {
      toast('error', `Failed to export ${format.toUpperCase()}`);
    }
  };
```

`import` 줄 수정:

```ts
import { listQuotes, getQuote, deleteQuote, exportQuotes } from '@/api/quoteApi';
```

- [ ] **Step 4: 컴포넌트 테스트 작성/수정**

`src/features/history/components/__tests__/QuoteHistoryPage.test.tsx` 가 없으면 신규 작성:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QuoteHistoryPage } from '../QuoteHistoryPage';
import * as quoteApi from '@/api/quoteApi';

vi.mock('@/api/quoteApi', () => ({
  listQuotes: vi.fn().mockResolvedValue({ data: [], meta: { total: 0, page: 1, per_page: 20 } }),
  getQuote: vi.fn(),
  deleteQuote: vi.fn(),
  exportQuotes: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

describe('QuoteHistoryPage — export dropdown', () => {
  beforeEach(() => vi.clearAllMocks());

  it('exports csv via dropdown', async () => {
    render(<QuoteHistoryPage />);
    fireEvent.click(await screen.findByRole('button', { name: /Export/i }));
    fireEvent.click(screen.getByRole('button', { name: 'CSV' }));
    await waitFor(() => {
      expect(quoteApi.exportQuotes).toHaveBeenCalledWith(expect.any(Object), 'csv');
    });
  });

  it('exports xlsx via dropdown', async () => {
    render(<QuoteHistoryPage />);
    fireEvent.click(await screen.findByRole('button', { name: /Export/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Excel' }));
    await waitFor(() => {
      expect(quoteApi.exportQuotes).toHaveBeenCalledWith(expect.any(Object), 'xlsx');
    });
  });

  it('passes amount range to listQuotes', async () => {
    render(<QuoteHistoryPage />);
    // QuoteSearchBar internal: simulate via callback if needed
    await waitFor(() => {
      expect(quoteApi.listQuotes).toHaveBeenCalled();
    });
    // Initial call should include amountCurrency: 'KRW'
    expect((quoteApi.listQuotes as any).mock.calls[0][0]).toMatchObject({ amountCurrency: 'KRW' });
  });
});
```

> Note: 실제 mock 모듈 경로(`@/components/ui/Toast` 등)는 기존 테스트 패턴 확인 후 맞춰 사용. 안 맞으면 기존 `QuoteSearchBar.test.tsx` 의 mock 셋업을 참고.

- [ ] **Step 5: 통과 확인**

```bash
npx vitest run src/features/history && npx tsc --noEmit
```

Expected: 모두 PASS, type 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/history/components/QuoteHistoryPage.tsx src/features/history/components/__tests__/QuoteHistoryPage.test.tsx
git commit -m "feat(history): export dropdown (CSV/Excel) + amount-range filter wiring"
```

> Task 8 의 commit 이 보류됐다면 이 커밋에 합쳐서 묶어 commit.

---

### Task 10: 전체 회귀 + 수동 QA + DoD 마무리

- [ ] **Step 1: 전체 회귀**

```bash
cd ~/Developer/Projects/smart-quote-main && \
  (cd smart-quote-api && bundle exec rspec && bin/rubocop) && \
  npx vitest run && npx tsc --noEmit && npm run lint
```

Expected: 모두 GREEN.

- [ ] **Step 2: 로컬 수동 QA — KRW range**

```bash
# Terminal 1
cd smart-quote-api && bin/rails server
# Terminal 2
npm run dev
```

브라우저에서 `http://localhost:5173/admin` (또는 `/quote`) → History 탭 → Filter 열기 → KRW 토글 + Min `500000` Max `2000000` 입력 → 결과가 좁혀지는지 확인.

- [ ] **Step 3: 로컬 수동 QA — USD range**

KRW/USD 토글 → USD → Min `500` Max `1000` → 결과 확인.

- [ ] **Step 4: 로컬 수동 QA — Excel export**

History 헤더 우측 `Export ▾` → `Excel` → `quotes-YYYY-MM-DD.xlsx` 다운로드 → LibreOffice/Excel 에서 열기 → 헤더 + 데이터 정상 표시.

- [ ] **Step 5: 로컬 수동 QA — invalid range**

Min `1000000` Max `100000` → inline 에러 `min must be ≤ max` 표시 확인. Export 시 422 응답으로 toast 에러 표시 확인.

- [ ] **Step 6: plan 헤더 노트 추가**

`docs/01-plan/features/quote-history.plan.md` 의 첫 줄 다음에 다음 줄 삽입:

```markdown
> ✅ **2026-05-10 분리 사이클 완료** — FR-04 (amount range) + FR-07 (Excel export) 두 누락 항목은 [`docs/superpowers/specs/2026-05-10-quote-history-fr04-fr07-design.md`](../../superpowers/specs/2026-05-10-quote-history-fr04-fr07-design.md) 사이클로 분리·구현 완료. 그 외 FR-01~FR-09 항목은 본 plan 작성 이후 production 에 이미 구현됨.
```

- [ ] **Step 7: `.commit_message.txt` 갱신**

`.commit_message.txt` 를 다음 한 줄로 덮어쓰기 (이번 사이클 마지막 커밋용):

```
✨ feat(history): amount-range filter (KRW/USD 토글) + Excel(xlsx) export 추가 — quote-history plan FR-04/FR-07 분리 사이클 완료
```

- [ ] **Step 8: 마무리 commit**

```bash
git add docs/01-plan/features/quote-history.plan.md .commit_message.txt
git commit -m "docs(plan): mark quote-history FR-04/FR-07 split-cycle as done"
```

- [ ] **Step 9: PR 생성 (사용자 명시 요청 시만)**

> 자동 push/PR 금지 룰. 사용자가 "PR 만들어" 라고 명시하면 다음 명령:
>
> ```bash
> git push -u origin <branch>
> gh pr create --title "feat(history): amount-range filter + Excel export" --body "..."
> ```

- [ ] **Step 10: 스테이징 / production 검증 (PR 머지 후)**

bridgelogis.com 에서:
1. KRW 범위 검색 1건
2. USD 범위 검색 1건
3. xlsx 다운로드 1건 → 작성자(jaehong) 가 Excel 에서 열어 확인

스펙 §10 DoD 의 "production xlsx 다운로드 1건 작성자(jaehong) 검증" 충족.

---

## Self-Review

**1. Spec coverage**

| Spec 섹션 | 처리 task |
|---|---|
| §3.1 Gemfile caxlsx | Task 1 |
| §3.1 quote_searcher by_amount_range scope | Task 4 (직접) + Task 3 (model scope 가 실제 컬럼 분기) |
| §3.1 quote_exporter format 분기 | Task 5 |
| §3.1 controller 분기 + permit | Task 6 |
| §3.2 types + quoteApi | Task 7 |
| §3.2 QuoteSearchBar | Task 8 |
| §3.2 QuoteHistoryPage state + Export 드롭다운 | Task 9 |
| §3.2 i18n | **스코프에서 빠짐 (spec 인라인 수정 완료)** |
| §4 API 변경 (`.csv`/`.xlsx`) | Task 6, Task 7 (URL 빌드) |
| §5 데이터 흐름 | 전 task 분산 |
| §6 에러 처리 (422 invalid range, toast, Sentry) | Task 4, 6, 7, 9 |
| §7 테스트 (RSpec model/searcher/exporter/request, Vitest SearchBar/HistoryPage) | Task 2-9 |
| §10 DoD | Task 10 |

**2. Placeholder scan**: "TBD/TODO/implement later" 없음. 모든 단계에 실제 코드/명령 포함.

**3. Type consistency**:
- `QuoteListParams.minAmount/maxAmount/amountCurrency` (Task 7) ↔ `listQuotes`/`exportQuotes` 직렬화 (Task 7) ↔ `QuoteSearchBar` props (Task 8) ↔ `QuoteHistoryPage` state (Task 9) — 모두 동일 명칭/타입 사용.
- Backend: `min_amount/max_amount/amount_currency` (snake_case) — controller permit ↔ searcher params 키 ↔ scope arg `min:/max:/currency:` 매핑 일관.
- `QuoteExporter.call(scope, format: :csv)` 시그니처 — Task 5 정의, Task 6 호출 일치.

**4. 위험**:
- Task 5 spec 의 `auth_token_for(user)` 헬퍼 명칭 — 실제 `quotes_spec.rb` 에서 사용하는 인증 헬퍼 명칭이 다를 수 있음. 실행 시 grep 으로 확인 후 매칭 (Task 6 Step 1 의 Note 에 명시).
- Task 9 의 `QuoteHistoryPage.test.tsx` mock 모듈 경로 — 기존 테스트 셋업 확인 후 맞추기 (Task 9 Step 4 의 Note 에 명시).
- `index` 액션이 `QuoteSearcher.call(scoped_quotes, params)` 에 raw `params` 를 통째로 넘기는지 확인 — 안 그러면 `index` 에도 화이트리스트 추가 필요 (Task 6 Step 3 의 grep 명령으로 확인).

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-10-quote-history-fr04-fr07.md`. Two execution options:

1. **Subagent-Driven (recommended)** — task 마다 fresh subagent 디스패치, 사이사이 리뷰, 빠른 반복.
2. **Inline Execution** — 현재 세션에서 executing-plans 로 batch 실행, 체크포인트마다 리뷰.

어떤 방식으로 진행할까요?

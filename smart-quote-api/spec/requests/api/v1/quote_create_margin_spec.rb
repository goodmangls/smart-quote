require "rails_helper"

# POST /api/v1/quotes saves a quote, so the margin it stores becomes the price.
# Only an admin chooses that margin. For everyone else the server resolves it
# from margin_rules — the same rule the calculator page shows them — and ignores
# whatever marginPercent the request carries. Otherwise a member calling the API
# directly could save a quote at 0% margin, i.e. at cost.
#
# Runs the real calculator (no stub): the stored price is the point.
RSpec.describe "POST /api/v1/quotes (server-side margin)", type: :request do
  let(:admin) { create(:user, :admin) }
  let(:member) { create(:user, nationality: "South Korea") }
  let(:admin_headers) { auth_headers(jwt_token_for(admin)) }
  let(:member_headers) { auth_headers(jwt_token_for(member)) }

  let(:params) do
    {
      destinationCountry: "US",
      destinationZip: "10001",
      domesticRegionCode: "A",
      incoterm: "FOB",
      packingType: "NONE",
      exchangeRate: 1300.0,
      fscPercent: 27.5,
      items: [
        { name: "Electronic Parts", quantity: 2, weight: 5.0, length: 40, width: 30, height: 20 }
      ]
    }
  end

  before { Rails.cache.clear }

  def save_quote(margin, headers:)
    post "/api/v1/quotes", params: params.merge(marginPercent: margin), headers: headers, as: :json
    expect(response).to have_http_status(:created)
    Quote.order(:created_at).last
  end

  # What the calculator charges at a given margin, for the same shipment.
  def total_at(margin)
    QuoteCalculator.call(params.merge(marginPercent: margin).deep_stringify_keys.with_indifferent_access)[:totalQuoteAmount]
  end

  context "as a member" do
    before { create(:margin_rule, :flat, name: "Everyone", priority: 10, margin_percent: 30) }

    it "ignores a 0% margin in the request and stores the rule's margin" do
      quote = save_quote(0, headers: member_headers)

      expect(quote.margin_percent.to_f).to eq(30.0)
      expect(quote.total_quote_amount.to_f).to eq(total_at(30).to_f)
      expect(quote.total_quote_amount.to_f).to be > total_at(0).to_f
    end

    it "ignores a margin above the rule too — the rule decides either way" do
      quote = save_quote(60, headers: member_headers)

      expect(quote.margin_percent.to_f).to eq(30.0)
    end

    it "uses the rule that matches the member's own email" do
      create(:margin_rule, :per_user, name: "VIP", match_email: member.email, margin_percent: 12)

      quote = save_quote(0, headers: member_headers)

      expect(quote.margin_percent.to_f).to eq(12.0)
    end

    it "rounds billable weight to 2 decimals before matching, as the calculator page does" do
      # useResolvedMargin asks /margin_rules/resolve with the weight rounded to
      # 0.01kg, so 19.999kg is matched as 20kg on screen. The save must agree.
      create(:margin_rule, name: "20kg+", priority: 50, weight_min: 20, margin_percent: 11)
      allow(QuoteCalculator).to receive(:call).and_wrap_original do |original, *args|
        original.call(*args).merge(billableWeight: 19.999)
      end

      quote = save_quote(0, headers: member_headers)

      expect(quote.margin_percent.to_f).to eq(11.0)
    end

    it "uses the rule that matches the member's nationality" do
      create(:margin_rule, :nationality, name: "Korea", priority: 50, margin_percent: 19)

      quote = save_quote(0, headers: member_headers)

      expect(quote.margin_percent.to_f).to eq(19.0)
    end
  end

  context "as an admin" do
    before { create(:margin_rule, :flat, name: "Everyone", priority: 10, margin_percent: 30) }

    it "keeps the margin the admin chose, including 0%" do
      quote = save_quote(0, headers: admin_headers)

      expect(quote.margin_percent.to_f).to eq(0.0)
      expect(quote.total_quote_amount.to_f).to eq(total_at(0).to_f)
    end
  end
end

require "rails_helper"

# Margin and cost are admin-only.
#
# Asserted on the RESPONSE BODY, not on what the UI draws: hiding a column while
# still shipping the number leaves it one DevTools tab away, which is exactly how
# the share-link leak stayed invisible.
#
# `totalCostAmount` and `breakdown.totalCost` count as margin data — either one
# against `totalQuoteAmount` yields the margin by arithmetic.
RSpec.describe "Quote margin visibility", type: :request do
  let(:admin) { create(:user, :admin) }
  let(:member) { create(:user) }

  let(:admin_headers) { auth_headers(jwt_token_for(admin)) }
  let(:member_headers) { auth_headers(jwt_token_for(member)) }

  let(:margin_keys) { %w[marginPercent totalCostAmount profitAmount profitMargin breakdown] }

  def json
    JSON.parse(response.body)
  end

  def quote_for(user)
    create(
      :quote,
      user: user,
      total_cost_amount: 1_200_000,
      profit_amount: 300_000,
      profit_margin: 20.0,
      margin_percent: 24.0,
      breakdown: { "totalCost" => 1_200_000, "intlBase" => 900_000 }
    )
  end

  describe "GET /api/v1/quotes (list)" do
    it "withholds the margin from a member" do
      quote_for(member)
      get "/api/v1/quotes", headers: member_headers

      expect(response).to have_http_status(:ok)
      expect(json["quotes"].first).not_to have_key("profitMargin")
    end

    it "still gives the margin to an admin" do
      quote_for(admin)
      get "/api/v1/quotes", headers: admin_headers

      expect(json["quotes"].first["profitMargin"]).to eq(20.0)
    end

    it "leaves the rest of the row intact for a member" do
      # Withholding margin must not blank the list — the member still needs the
      # quote itself.
      quote_for(member)
      get "/api/v1/quotes", headers: member_headers

      row = json["quotes"].first
      expect(row["totalQuoteAmount"]).to be_present
      expect(row["referenceNo"]).to be_present
      expect(row["billableWeight"]).to be_present
    end
  end

  describe "GET /api/v1/quotes/:id (detail)" do
    it "withholds margin, cost and the cost breakdown from a member" do
      quote = quote_for(member)
      get "/api/v1/quotes/#{quote.id}", headers: member_headers

      expect(response).to have_http_status(:ok)
      margin_keys.each do |key|
        expect(json).not_to have_key(key), "#{key} must not reach a member"
      end
    end

    it "gives all of it to an admin" do
      quote = quote_for(admin)
      get "/api/v1/quotes/#{quote.id}", headers: admin_headers

      margin_keys.each { |key| expect(json).to have_key(key) }
      expect(json["profitMargin"]).to eq(20.0)
      expect(json.dig("breakdown", "totalCost")).to eq(1_200_000)
    end

    it "leaves the quote usable for a member" do
      quote = quote_for(member)
      get "/api/v1/quotes/#{quote.id}", headers: member_headers

      expect(json["totalQuoteAmount"]).to be_present
      expect(json["items"]).to be_present
      expect(json["appliedZone"]).to be_present
    end
  end

  describe "POST /api/v1/quotes (create)" do
    # The creator gets `detail` straight back, so this is a second way in.
    let(:calculator_result) do
      {
        totalQuoteAmount: 1_500_000, totalQuoteAmountUSD: 1_150.50,
        totalCostAmount: 1_200_000, profitAmount: 300_000, profitMargin: 20.0,
        billableWeight: 15.5, appliedZone: "Z5", domesticTruckType: "1t Truck",
        breakdown: { totalCost: 1_200_000 }, warnings: []
      }
    end

    before { allow(QuoteCalculator).to receive(:call).and_return(calculator_result) }

    it "withholds the margin from a member creating a quote" do
      post "/api/v1/quotes",
           params: {
             destinationCountry: "US", incoterm: "DAP",
             exchangeRate: 1400.0, fscPercent: 46.75,
             items: [ { name: "Box", quantity: 1, weight: 5.0, length: 40, width: 30, height: 20 } ]
           },
           headers: member_headers, as: :json

      expect(response).to have_http_status(:created)
      margin_keys.each do |key|
        expect(json).not_to have_key(key), "#{key} must not reach a member"
      end
    end

    it "still returns it to an admin" do
      post "/api/v1/quotes",
           params: {
             destinationCountry: "US", incoterm: "DAP",
             exchangeRate: 1400.0, fscPercent: 46.75,
             items: [ { name: "Box", quantity: 1, weight: 5.0, length: 40, width: 30, height: 20 } ]
           },
           headers: admin_headers, as: :json

      expect(json["profitMargin"]).to eq(20.0)
    end
  end

  describe "the serializer default" do
    # Deny by default: a call site that forgets the flag must fail closed.
    it "omits the margin when nobody says otherwise" do
      quote = quote_for(admin)

      expect(QuoteSerializer.summary(quote)).not_to have_key(:profitMargin)
      margin_keys.map(&:to_sym).each do |key|
        expect(QuoteSerializer.detail(quote)).not_to have_key(key)
      end
    end
  end
end

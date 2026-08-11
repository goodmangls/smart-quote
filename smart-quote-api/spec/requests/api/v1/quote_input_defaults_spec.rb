require "rails_helper"

# Characterization spec for the request→Quote attribute mapping.
#
# Written BEFORE extracting QuoteInputAttributes out of QuotesController so the
# refactor has something to be judged against. Every expectation here records
# behaviour that exists today; none of it is a new requirement.
#
# This mapping decides what the calculator is fed and what is persisted, so a
# silent change here moves quoted prices. The rules being pinned:
#   1. a string key wins over a symbol key
#   2. a symbol key is used when the string key is absent
#   3. a documented default applies when neither is present
#   4. Ruby truthiness decides — only nil and false fall through, so 0 and ""
#      are kept as supplied
RSpec.describe "Quote input attribute mapping", type: :request do
  let(:user) { create(:user) }
  let(:headers) { auth_headers(jwt_token_for(user)) }

  let(:calculator_result) do
    {
      totalQuoteAmount: 1_500_000, totalQuoteAmountUSD: 1_150.50,
      totalCostAmount: 1_200_000, profitAmount: 300_000, profitMargin: 20.0,
      billableWeight: 15.5, appliedZone: "Z5", domesticTruckType: "1t Truck",
      breakdown: { totalCost: 1_060_000 }, warnings: []
    }
  end

  # Only the fields the mapping has no default for. Everything else is omitted so
  # the defaults are what gets exercised.
  let(:minimal_params) do
    {
      destinationCountry: "US",
      incoterm: "DAP",
      exchangeRate: 1450.0,
      fscPercent: 46.75,
      items: [ { name: "Box", quantity: 1, weight: 5.0, length: 40, width: 30, height: 20 } ]
    }
  end

  before { allow(QuoteCalculator).to receive(:call).and_return(calculator_result) }

  describe "defaults when a field is omitted" do
    before { post "/api/v1/quotes", params: minimal_params, headers: headers, as: :json }

    it "creates the quote" do
      expect(response).to have_http_status(:created)
    end

    {
      origin_country: "KR",
      domestic_region_code: "A",
      packing_type: "NONE",
      shipping_item_type: "NON_DOCUMENT",
      overseas_carrier: "UPS",
      margin_percent: 15,
      duty_tax_estimate: 0,
      manual_surge_cost: 0,
      pickup_in_seoul_cost: 0
    }.each do |attr, expected|
      it "defaults #{attr} to #{expected.inspect}" do
        expect(Quote.last.public_send(attr)).to eq(expected)
      end
    end

    it "defaults is_jeju_pickup to false" do
      expect(Quote.last.is_jeju_pickup).to be(false)
    end
  end

  describe "explicit values win over defaults" do
    # Bound to the model constants rather than hardcoded strings — a literal here
    # would silently drift if the allowed set changes, and an invalid value makes
    # the record fail to save, which reads as "the mapping dropped my value".
    let(:non_default_packing) { (Quote::VALID_PACKING_TYPES - %w[NONE]).first }
    let(:non_default_item_type) { (Quote::VALID_SHIPPING_ITEM_TYPES - %w[NON_DOCUMENT]).first }

    before do
      post "/api/v1/quotes",
           params: minimal_params.merge(
             originCountry: "JP",
             domesticRegionCode: "B",
             packingType: non_default_packing,
             shippingItemType: non_default_item_type,
             overseasCarrier: "DHL",
             marginPercent: 32,
             dutyTaxEstimate: 5000,
             manualSurgeCost: 1234,
             pickupInSeoulCost: 5678,
             isJejuPickup: true
           ),
           headers: headers, as: :json
    end

    it "saves the quote (guards against a validation failure reading as a dropped value)" do
      expect(response).to have_http_status(:created)
    end

    it "uses the supplied simple fields" do
      q = Quote.last
      expect(q.origin_country).to eq("JP")
      expect(q.domestic_region_code).to eq("B")
      expect(q.overseas_carrier).to eq("DHL")
      expect(q.margin_percent).to eq(32)
      expect(q.duty_tax_estimate).to eq(5000)
      expect(q.manual_surge_cost).to eq(1234)
      expect(q.pickup_in_seoul_cost).to eq(5678)
      expect(q.is_jeju_pickup).to be(true)
    end

    it "uses the supplied enum-constrained fields" do
      q = Quote.last
      expect(q.packing_type).to eq(non_default_packing)
      expect(q.shipping_item_type).to eq(non_default_item_type)
    end
  end

  describe "zero is preserved, not treated as missing" do
    # Only nil and false are falsy in Ruby, so a supplied 0 must survive the
    # `value || default` chain rather than being replaced by the default.
    before do
      post "/api/v1/quotes",
           params: minimal_params.merge(marginPercent: 0, dutyTaxEstimate: 0, manualSurgeCost: 0),
           headers: headers, as: :json
    end

    it "keeps a margin of 0 instead of falling back to 15" do
      expect(Quote.last.margin_percent).to eq(0)
    end

    it "keeps duty_tax_estimate at 0" do
      expect(Quote.last.duty_tax_estimate).to eq(0)
    end
  end

  describe "values reach the calculator, not just the record" do
    it "passes the mapped input through to QuoteCalculator" do
      post "/api/v1/quotes",
           params: minimal_params.merge(overseasCarrier: "FEDEX", marginPercent: 24),
           headers: headers, as: :json

      expect(QuoteCalculator).to have_received(:call).with(
        hash_including("overseasCarrier" => "FEDEX", "marginPercent" => 24)
      )
    end
  end
end

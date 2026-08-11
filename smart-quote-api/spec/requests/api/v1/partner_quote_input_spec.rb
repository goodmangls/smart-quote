require "rails_helper"

# Characterization spec for the partner payload → calculator input mapping.
#
# Written BEFORE extracting PartnerQuoteInput out of QuotesController so the
# refactor has something to be judged against. Everything here records behaviour
# that exists today.
#
# This mapping decides what the calculator is fed for partner traffic, so a change
# moves partner prices. Assertions read the hash handed to QuoteCalculator rather
# than the saved record, because that is where the mapping's output actually lands.
RSpec.describe "Partner quote input mapping", type: :request do
  let(:partner_identity) { "bridgelogis@partner.quote-api" }
  let!(:partner_key) { create(:partner_api_key, margin_identity: partner_identity) }
  let(:raw_key) { partner_key.instance_variable_get(:@raw_key) }
  let(:headers) { { "X-API-Key" => raw_key } }

  let!(:margin_rule) do
    MarginRule.find_or_create_by!(match_email: partner_identity, priority: 90) do |r|
      r.name = "Partner API — spec"
      r.rule_type = "flat"
      r.margin_percent = 24
      r.is_active = true
    end
  end

  let(:calculator_result) do
    {
      totalQuoteAmount: 1_500_000, totalQuoteAmountUSD: 1_150.50,
      totalCostAmount: 1_200_000, profitAmount: 300_000, profitMargin: 20.0,
      billableWeight: 15.5, appliedZone: "Z5", domesticTruckType: "1t Truck",
      breakdown: { totalCost: 1_060_000 }, warnings: []
    }
  end

  # Only what the endpoint requires. Everything else is omitted so the defaults
  # are what gets exercised.
  let(:minimal) do
    {
      destination: { country: "BE" },
      cargo: { packages: [ { quantity: 1, length_cm: 50, width_cm: 40, height_cm: 30, gross_weight_kg: 10 } ] }
    }
  end

  before { allow(QuoteCalculator).to receive(:call).and_return(calculator_result) }

  def post_partner(payload)
    post "/api/v1/quote_api/quotes", params: payload, headers: headers, as: :json
  end

  def calculator_input
    captured = nil
    allow(QuoteCalculator).to receive(:call) { |arg| captured = arg; calculator_result }
    yield
    captured
  end

  describe "defaults when a section is omitted" do
    it "applies documented defaults" do
      input = calculator_input { post_partner(minimal) }

      expect(response).to have_http_status(:created)
      expect(input).to include(
        "originCountry" => "KR",
        "domesticRegionCode" => "A",
        "incoterm" => "DAP",
        "packingType" => "NONE",
        "shippingMode" => "express_courier",
        "overseasCarrier" => "UPS",
        "dutyTaxEstimate" => 0.0,
        "manualSurgeCost" => 0.0
      )
    end

    # ActiveModel::Type::Boolean.cast(nil) returns nil, not false, so an omitted
    # origin.is_jeju_pickup reaches the calculator as nil. QuoteInputAttributes
    # then turns it into false for the saved record (`... || false`), which is why
    # this has never surfaced. Recorded as-is; changing it is a separate decision.
    it "leaves isJejuPickup nil when omitted" do
      input = calculator_input { post_partner(minimal) }
      expect(input["isJejuPickup"]).to be_nil
    end

    it "charges no domestic pickup cost unless pickup_required is set" do
      input = calculator_input { post_partner(minimal) }
      expect(input["manualDomesticCost"]).to eq(0)
    end
  end

  describe "explicit values" do
    it "uses the supplied route, terms and carrier" do
      input = calculator_input do
        post_partner(minimal.deep_merge(
          carrier: "dhl",
          service_type: "economy",
          origin: { country: "JP", domestic_region_code: "B", is_jeju_pickup: "true" },
          destination: { country: "US", postal_code: "10001" },
          terms: { incoterms: "DDP", duty_tax_estimate: 5000 },
          cargo: { packing_type: "WOODEN_BOX" }
        ))
      end

      expect(input).to include(
        "originCountry" => "JP",
        "destinationCountry" => "US",
        "destinationZip" => "10001",
        "domesticRegionCode" => "B",
        "incoterm" => "DDP",
        "packingType" => "WOODEN_BOX",
        "shippingMode" => "economy",
        "dutyTaxEstimate" => 5000.0
      )
      expect(input["isJejuPickup"]).to be(true)
    end

    it "upcases the carrier" do
      input = calculator_input { post_partner(minimal.merge(carrier: "dhl")) }
      expect(input["overseasCarrier"]).to eq("DHL")
    end

    it "falls back to the destination airport when postal_code is absent" do
      input = calculator_input { post_partner(minimal.deep_merge(destination: { airport: "BRU" })) }
      expect(input["destinationZip"]).to eq("BRU")
    end
  end

  describe "pickup cost is conditional on pickup_required" do
    it "uses pickup_cost when pickup_required is truthy" do
      input = calculator_input do
        post_partner(minimal.deep_merge(terms: { pickup_required: true, pickup_cost: 80_000 }))
      end
      expect(input["manualDomesticCost"]).to eq(80_000.0)
    end

    it "ignores pickup_cost when pickup_required is falsy" do
      input = calculator_input do
        post_partner(minimal.deep_merge(terms: { pickup_required: false, pickup_cost: 80_000 }))
      end
      expect(input["manualDomesticCost"]).to eq(0)
    end
  end

  describe "margin never comes from the payload" do
    it "uses the margin rule matched on the API key identity" do
      input = calculator_input { post_partner(minimal.merge(margin_percent: 0)) }
      expect(input["marginPercent"]).to eq(24.0)
    end
  end

  describe "packages" do
    it "maps package fields and generates ids/names when absent" do
      input = calculator_input { post_partner(minimal) }

      expect(input["items"]).to eq([
        { "id" => "api-package-1", "name" => "Package 1", "quantity" => 1,
          "weight" => 10.0, "length" => 50.0, "width" => 40.0, "height" => 30.0 }
      ])
    end

    it "keeps supplied id/name and defaults quantity to 1" do
      input = calculator_input do
        post_partner(minimal.deep_merge(cargo: { packages: [
          { id: "P-9", name: "Crate", length_cm: 10, width_cm: 10, height_cm: 10, gross_weight_kg: 2 }
        ] }))
      end

      expect(input["items"].first).to include("id" => "P-9", "name" => "Crate", "quantity" => 1)
    end

    it "rejects a payload with no packages" do
      post_partner(minimal.merge(cargo: { packages: [] }))

      expect(response).to have_http_status(:unprocessable_entity)
      expect(JSON.parse(response.body).dig("error", "message")).to match(/cargo\.packages/)
    end
  end

  describe "exchange rate and FSC" do
    it "uses the supplied exchange rate" do
      input = calculator_input { post_partner(minimal.merge(exchange_rate: 1400)) }
      expect(input["exchangeRate"]).to eq(1400.0)
    end

    it "falls back to the configured default exchange rate" do
      input = calculator_input { post_partner(minimal) }
      expect(input["exchangeRate"]).to eq(Constants::Rates::DEFAULT_EXCHANGE_RATE.to_f)
    end

    it "uses the supplied fsc_percent" do
      input = calculator_input { post_partner(minimal.merge(fsc_percent: 12.5)) }
      expect(input["fscPercent"]).to eq(12.5)
    end

    it "resolves FSC from FscFetcher when not supplied" do
      allow(FscFetcher).to receive(:current_rates).and_return({ "UPS" => { "international" => 77.7 } })
      input = calculator_input { post_partner(minimal) }
      expect(input["fscPercent"]).to eq(77.7)
    end

    it "falls back to the DHL constant for DHL when FscFetcher has nothing" do
      allow(FscFetcher).to receive(:current_rates).and_return({})
      input = calculator_input { post_partner(minimal.merge(carrier: "DHL")) }
      expect(input["fscPercent"]).to eq(Constants::Rates::DEFAULT_FSC_PERCENT_DHL.to_f)
    end

    it "falls back to the UPS constant for other carriers when FscFetcher has nothing" do
      allow(FscFetcher).to receive(:current_rates).and_return({})
      input = calculator_input { post_partner(minimal) }
      expect(input["fscPercent"]).to eq(Constants::Rates::DEFAULT_FSC_PERCENT.to_f)
    end
  end
end

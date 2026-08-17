require "rails_helper"
require "json"

RSpec.describe QuoteCalculator, "Calculation Parity" do
  let(:fixtures_path) { Rails.root.join("..", "shared", "test-fixtures", "calculation-parity.json") }
  let(:fixtures) { JSON.parse(File.read(fixtures_path)) }

  fixtures_data = JSON.parse(File.read(File.expand_path("../../../shared/test-fixtures/calculation-parity.json", __dir__)))

  # Every fixture carries an "expected" block asserted to the KRW here and, with
  # the same numbers, in src/features/quote/services/__tests__/calculationParity.test.ts.
  # Sharing an input file does not by itself make two implementations agree —
  # only the baked expected values do. (The historical ~5% UPS display-vs-saved
  # gap was closed 2026-08-17 when the UPS/DHL add-on mirrors landed.)
  fixtures_data["fixtures"].select { |f| f["expected"] }.each do |fixture|
    it "matches the frontend to the KRW: #{fixture['name']}" do
      result = QuoteCalculator.call(fixture["input"])
      expected = fixture["expected"]

      expect(result[:totalQuoteAmount]).to eq(expected["totalQuoteAmount"])
      expect(result[:totalCostAmount]).to be_within(0.0001).of(expected["totalCostAmount"])
      expect(result[:billableWeight]).to be_within(0.0001).of(expected["billableWeight"])
      expect(result[:breakdown][:intlBase]).to be_within(0.0001).of(expected["intlBase"])
      expect(result[:breakdown][:carrierAddOnTotal] || 0)
        .to be_within(0.0001).of(expected["carrierAddOnTotal"])
      expect((result[:breakdown][:carrierAddOnDetails] || []).map { |d| d[:code] }.sort)
        .to eq(expected["carrierAddOnCodes"])
    end
  end

  fixtures_data["fixtures"].each do |fixture|
    context fixture["name"] do
      let(:result) { QuoteCalculator.call(fixture["input"]) }

      it "produces valid output" do
        expect(result[:totalCostAmount]).to be >= 0
        expect(result[:totalQuoteAmount]).to be >= 0
        expect(result[:carrier]).to be_present
        expect(result[:breakdown]).to be_present
        expect(result[:breakdown][:totalCost]).to eq(result[:totalCostAmount])
      end

      it "includes all breakdown fields" do
        %i[
          packingMaterial packingLabor packingFumigation handlingFees
          pickupInSeoul intlBase intlFsc intlWarRisk intlSurge
          destDuty totalCost
        ].each do |field|
          expect(result[:breakdown]).to have_key(field), "Missing breakdown field: #{field}"
          expect(result[:breakdown][field]).to be_a(Numeric)
        end
      end
    end
  end

  context "specific field checks" do
    it "includes pickupInSeoulCost in totalCostAmount" do
      fixture = fixtures_data["fixtures"].find { |f| f["name"] == "dhl_eu_with_pickup" }
      result = QuoteCalculator.call(fixture["input"])

      expect(result[:breakdown][:pickupInSeoul]).to eq(50_000)
      expect(result[:totalCostAmount]).to be > 50_000
    end

    it "includes manualSurgeCost in breakdown.intlSurge" do
      fixture = fixtures_data["fixtures"].find { |f| f["name"] == "ups_us_ddp_full_options" }
      result = QuoteCalculator.call(fixture["input"])

      expect(result[:breakdown][:intlSurge]).to eq(35_000)
    end

    it "handling fee is always 0 (no auto handling fee)" do
      fixture = fixtures_data["fixtures"].find { |f| f["name"] == "basic_ups_us_wooden_box" }
      result = QuoteCalculator.call(fixture["input"])

      expect(result[:breakdown][:handlingFees]).to eq(0)
    end

    it "zeroes fumigation when manualPackingCost overrides Packing & Docs" do
      fixture = fixtures_data["fixtures"].find { |f| f["name"] == "ups_jp_manual_packing" }
      result = QuoteCalculator.call(fixture["input"])

      expect(result[:breakdown][:handlingFees]).to eq(0)
      expect(result[:breakdown][:packingFumigation]).to eq(0)
    end

    it "returns carrier field in result" do
      fixture = fixtures_data["fixtures"].find { |f| f["name"] == "basic_ups_us_wooden_box" }
      result = QuoteCalculator.call(fixture["input"])

      expect(result[:carrier]).to eq("UPS")
    end
  end
end

# frozen_string_literal: true

require "rails_helper"

RSpec.describe PartnerQuoteResponse do
  let(:api_params) do
    {
      "service_type" => "express",
      "carrier" => "UPS",
      "origin" => { "city" => "Seoul" },
      "destination" => { "city" => "Tokyo", "airport" => "NRT" },
      "cargo" => {
        "packages" => [
          { "quantity" => 2, "gross_weight_kg" => 3.5, "length_cm" => 30, "width_cm" => 20, "height_cm" => 10 }
        ]
      },
      "requested_by" => { "company" => "Acme", "contact" => "Kim", "email" => "kim@acme.test" }
    }
  end

  describe ".gross_weight / .volume_weight" do
    it "sums quantity-weighted declared weights" do
      packages = api_params.dig("cargo", "packages")

      expect(described_class.gross_weight(packages)).to eq(7.0)
      # 2 * 30*20*10 / 5000 = 2.4 -> ceil -> 3.0
      expect(described_class.volume_weight(packages)).to eq(3.0)
    end
  end

  describe ".body" do
    it "builds the partner envelope (USD total only, no margin/breakdown)" do
      quote = create(:quote, reference_no: nil)
      result = { billableWeight: 7.0, totalQuoteAmountUSD: 123.456, transitTime: "2-3" }

      body = described_class.body(quote: quote, result: result, api_params: api_params)

      expect(body[:quote_id]).to eq(quote.reference_no)
      expect(body[:pricing]).to eq(currency: "USD", total: 123.46)
      expect(body[:cargo_summary]).to include(packages: 2, gross_weight_kg: 7.0, volume_weight_kg: 3.0)
      expect(body[:route]).to include(destination_city: "Tokyo", destination_airport: "NRT")
      expect(body.keys).not_to include(:margin, :breakdown, :total_cost_amount)
    end
  end

  describe ".audit_metadata" do
    it "captures the partner identity and request context" do
      api_key = instance_double(PartnerApiKey, id: 7, name: "acme-key")

      metadata = described_class.audit_metadata(api_params: api_params, api_key: api_key)

      expect(metadata).to include(
        source: "quote_api_v1",
        partner_api_key_id: 7,
        partner_name: "acme-key",
        service_type: "express",
        carrier: "UPS"
      )
    end
  end
end

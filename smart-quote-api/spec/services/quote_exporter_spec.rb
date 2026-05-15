require "rails_helper"

RSpec.describe QuoteExporter do
  let!(:quote) {
    create(:quote,
      reference_no: "SQ-2026-0001",
      destination_country: "JP",
      incoterm: "DAP",
      billable_weight: 25.5,
      total_cost_amount: 800_000,
      total_quote_amount: 1_000_000,
      total_quote_amount_usd: 700.00,
      profit_margin: 20.0,
      status: "draft")
  }
  let(:scope) { Quote.where(id: quote.id) }

  describe ".call (csv default — regression)" do
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

    it "produces a binary xlsx (zip-magic header)" do
      # xlsx is a zip archive, starts with PK magic bytes
      expect(result[:xlsx_data][0, 2]).to eq("PK")
    end

    it "raises TooLargeError when scope exceeds MAX_EXPORT_COUNT" do
      stub_const("QuoteExporter::MAX_EXPORT_COUNT", 0)
      expect { described_class.call(scope, format: :xlsx) }.to raise_error(QuoteExporter::TooLargeError)
    end
  end
end

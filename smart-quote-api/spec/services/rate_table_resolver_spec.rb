# frozen_string_literal: true

require "rails_helper"

RSpec.describe Calculators::RateTableResolver do
  it "uses UPS Document table within 5kg" do
    result = described_class.call(
      carrier: "UPS",
      shipping_item_type: "DOCUMENT",
      billable_weight: 1
    )
    expect(result[:used_document]).to eq(true)
    expect(result[:exact]).to eq(Constants::UpsTariff::UPS_DOC_EXACT_RATES)
  end

  it "falls back to UPS Non-Document above 5kg" do
    result = described_class.call(
      carrier: "UPS",
      shipping_item_type: "DOCUMENT",
      billable_weight: 5.1
    )
    expect(result[:used_document]).to eq(false)
    expect(result[:exact]).to eq(Constants::UpsTariff::UPS_EXACT_RATES)
  end

  it "uses DHL Document table within 2kg" do
    result = described_class.call(
      carrier: "DHL",
      shipping_item_type: "DOCUMENT",
      billable_weight: 2
    )
    expect(result[:used_document]).to eq(true)
    expect(result[:exact]).to eq(Constants::DhlTariff::DHL_DOC_EXACT_RATES)
  end
end

RSpec.describe Calculators::UpsCost, "document rates" do
  it "returns Document rate for JP 1kg" do
    result = described_class.call(
      billable_weight: 1,
      country: "JP",
      shipping_item_type: "DOCUMENT"
    )
    expect(result[:intl_base]).to eq(30_134)
  end

  it "returns Non-Document rate when type omitted" do
    result = described_class.call(billable_weight: 1, country: "JP")
    expect(result[:intl_base]).to eq(55_784)
  end
end

# frozen_string_literal: true

require "rails_helper"

# Mirrors src/features/quote/services/__tests__/dhlAddonCalculator.test.ts —
# the numbers here are the FE expectations verbatim.
RSpec.describe Calculators::DhlAddon do
  def make_input(overrides = {})
    {
      originCountry: "KR",
      destinationCountry: "JP",
      incoterm: "DAP",
      packingType: "NONE",
      items: [ { id: "1", length: 30, width: 30, height: 30, weight: 20, quantity: 1 } ],
      fscPercent: 0,
      dhlAddOns: []
    }.merge(overrides)
  end

  def total_for(input, billable_weight, fsc_percent)
    described_class.call(input: input, billable_weight: billable_weight, fsc_percent: fsc_percent)[:total]
  end

  it "charges nothing without add-ons" do
    expect(total_for(make_input, 20, 0)).to eq(0)
  end

  it "auto-detects OSP above 100cm longest edge, not at the boundary" do
    oversize = make_input(items: [ { id: "1", length: 110, width: 30, height: 30, weight: 20, quantity: 1 } ])
    expect(total_for(oversize, 20, 0)).to eq(30_000)

    boundary = make_input(items: [ { id: "1", length: 100, width: 30, height: 30, weight: 20, quantity: 1 } ])
    expect(total_for(boundary, 20, 0)).to eq(0)
  end

  it "auto-detects OSP on the second-longest edge above 80cm" do
    input = make_input(items: [ { id: "1", length: 90, width: 85, height: 30, weight: 20, quantity: 1 } ])
    expect(total_for(input, 20, 0)).to eq(30_000)
  end

  it "prices OSP per piece and applies FSC" do
    two_pieces = make_input(items: [ { id: "1", length: 110, width: 30, height: 30, weight: 20, quantity: 2 } ])
    expect(total_for(two_pieces, 20, 0)).to eq(60_000)

    with_fsc = make_input(items: [ { id: "1", length: 110, width: 30, height: 30, weight: 20, quantity: 1 } ])
    expect(total_for(with_fsc, 20, 46)).to eq(43_800)
  end

  it "auto-detects OWT above 70kg per carton, not at the boundary, with FSC" do
    heavy = make_input(items: [ { id: "1", length: 30, width: 30, height: 30, weight: 80, quantity: 1 } ])
    expect(total_for(heavy, 80, 0)).to eq(150_000)
    expect(total_for(heavy, 80, 46)).to eq(219_000)

    boundary = make_input(items: [ { id: "1", length: 30, width: 30, height: 30, weight: 70, quantity: 1 } ])
    expect(total_for(boundary, 70, 0)).to eq(0)
  end

  it "prices selected RMT at max(35,000, 750/kg)" do
    expect(total_for(make_input(dhlAddOns: [ "RMT" ]), 50, 0)).to eq(37_500)
  end

  it "prices INS at max(declared value × 1%, 17,000) without FSC" do
    input = make_input(dhlAddOns: [ "INS" ], dhlDeclaredValue: 2_000_000)
    expect(total_for(input, 20, 0)).to eq(20_000)
  end

  it "prices IRR per piece with FSC" do
    input = make_input(
      items: [ { id: "1", length: 30, width: 30, height: 30, weight: 20, quantity: 2 } ],
      dhlAddOns: [ "IRR" ]
    )
    expect(total_for(input, 20, 46)).to eq(87_600)
  end

  it "uses DB rates exclusively when present (a code missing from the DB is not charged)" do
    # Oversized item, but the DB set carries only SAT — OSP must not be charged.
    input = make_input(
      items: [ { id: "1", length: 110, width: 30, height: 30, weight: 20, quantity: 1 } ],
      dhlAddOns: [ "SAT" ],
      resolvedAddonRates: [
        { carrier: "DHL", code: "SAT", amount: 55_000, fscApplicable: true,
          nameKo: "토요일 배송", nameEn: "Saturday Delivery", chargeType: "fixed",
          perKgRate: nil, ratePercent: nil, minAmount: nil, detectRules: nil }
      ]
    )

    result = described_class.call(input: input, billable_weight: 20, fsc_percent: 0)

    expect(result[:total]).to eq(55_000)
    expect(result[:details].map { |d| d[:code] }).to eq([ "SAT" ])
  end

  it "detects OSP on packed dimensions (packing pushes a 95cm box over 100cm)" do
    input = make_input(
      packingType: "WOODEN_BOX",
      items: [ { id: "1", length: 95, width: 30, height: 30, weight: 20, quantity: 1 } ]
    )
    result = described_class.call(input: input, billable_weight: 25, fsc_percent: 0)

    expect(result[:details].map { |d| d[:code] }).to include("OSP")
  end
end

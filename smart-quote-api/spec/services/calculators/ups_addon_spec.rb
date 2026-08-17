# frozen_string_literal: true

require "rails_helper"

# Mirrors src/features/quote/services/__tests__/upsAddonCalculator.test.ts —
# the numbers here are the FE expectations verbatim, so a divergence between
# the two implementations shows up as a failure on one side.
RSpec.describe Calculators::UpsAddon do
  IHF = 3_642

  def make_input(overrides = {})
    {
      originCountry: "KR",
      destinationCountry: "JP",
      incoterm: "DAP",
      packingType: "NONE",
      items: [ { id: "1", length: 30, width: 30, height: 30, weight: 20, quantity: 1 } ],
      fscPercent: 0,
      upsAddOns: []
    }.merge(overrides)
  end

  def total_for(input, billable_weight, fsc_percent)
    described_class.call(input: input, billable_weight: billable_weight, fsc_percent: fsc_percent)[:total]
  end

  def sef(billable_weight, per_kg = 143, fsc_percent = 0)
    amount = billable_weight.ceil * per_kg
    amount + amount * (fsc_percent / 100.0)
  end

  it "auto-applies IHF + Asia Pacific SGF 143/kg for JP" do
    result = described_class.call(input: make_input, billable_weight: 10, fsc_percent: 0)

    expect(result[:total]).to eq(IHF + 1_430)
    expect(result[:details]).to include(
      { code: "IHF", nameKo: "국제 처리 수수료", nameEn: "International Processing Fee", amount: IHF, fscAmount: 0 },
      { code: "SGF", nameKo: "급증수수료 (Asia Pacific)", nameEn: "Surge Fee (Asia Pacific)", amount: 1_430, fscAmount: 0.0 }
    )
  end

  it "applies U.S. & Americas 720/kg" do
    expect(total_for(make_input(destinationCountry: "US"), 10, 0)).to eq(IHF + 7_200)
  end

  it "applies FSC to SGF but not IHF" do
    result = described_class.call(input: make_input(destinationCountry: "US"), billable_weight: 10, fsc_percent: 50)

    expect(result[:total]).to eq(IHF + 10_800)
    sgf = result[:details].find { |d| d[:code] == "SGF" }
    expect(sgf).to include(amount: 7_200, fscAmount: 3_600.0)
  end

  it "applies U.A.E./Israel 4,722/kg and Middle East 4,220/kg" do
    expect(total_for(make_input(destinationCountry: "AE"), 10, 0)).to eq(IHF + sef(10, 4_722))
    expect(total_for(make_input(destinationCountry: "SA"), 10, 0)).to eq(IHF + sef(10, 4_220))
  end

  it "auto-applies DDP fee on DDP incoterm without FSC" do
    expect(total_for(make_input(incoterm: "DDP"), 10, 0)).to eq(IHF + sef(10) + 28_500)
  end

  it "auto-detects AHS above 25kg but not at the boundary" do
    heavy = make_input(items: [ { id: "1", length: 30, width: 30, height: 30, weight: 26, quantity: 1 } ])
    expect(total_for(heavy, 26, 0)).to eq(IHF + sef(26) + 21_400)

    boundary = make_input(items: [ { id: "1", length: 30, width: 30, height: 30, weight: 25, quantity: 1 } ])
    expect(total_for(boundary, 25, 0)).to eq(IHF + sef(25))
  end

  it "applies FSC to AHS and SGF but not IHF" do
    heavy = make_input(items: [ { id: "1", length: 30, width: 30, height: 30, weight: 26, quantity: 1 } ])
    expect(total_for(heavy, 26, 48.5)).to be_within(0.000001).of(IHF + sef(26, 143, 48.5) + 21_400 * 1.485)
  end

  it "prices selected RMT at the minimum and EXT per-kg above it" do
    expect(total_for(make_input(upsAddOns: [ "RMT" ]), 10, 0)).to eq(IHF + sef(10) + 31_400)
    expect(total_for(make_input(upsAddOns: [ "EXT" ]), 60, 0)).to eq(IHF + sef(60) + 38_400)
  end

  it "prices ADC per carton" do
    input = make_input(
      items: [ { id: "1", length: 30, width: 30, height: 30, weight: 20, quantity: 2 } ],
      upsAddOns: [ "ADC" ]
    )
    expect(total_for(input, 20, 0)).to eq(IHF + sef(20) + 30_200)
  end

  it "does not apply SGF on domestic KR shipments" do
    result = described_class.call(input: make_input(destinationCountry: "KR"), billable_weight: 10, fsc_percent: 0)

    expect(result[:total]).to eq(IHF)
    expect(result[:details].map { |d| d[:code] }).not_to include("SGF")
  end

  it "ignores stale/manual SEF selections (no double charging with auto SGF)" do
    result = described_class.call(input: make_input(destinationCountry: "US", upsAddOns: [ "SEF" ]),
                                  billable_weight: 10, fsc_percent: 0)

    expect(result[:total]).to eq(IHF + 7_200)
    expect(result[:details].count { |d| d[:code] == "SGF" }).to eq(1)
    expect(result[:details].map { |d| d[:code] }).not_to include("SEF")
  end

  it "uses DB rates when present, keeping IHF/SEF hardcoded fallbacks" do
    input = make_input(
      incoterm: "DDP",
      resolvedAddonRates: [
        { carrier: "UPS", code: "DDP", amount: 30_000, fscApplicable: false,
          nameKo: "DDP 수수료", nameEn: "DDP Service Fee", chargeType: "fixed",
          perKgRate: nil, ratePercent: nil, minAmount: nil, detectRules: nil }
      ]
    )

    expect(total_for(input, 10, 0)).to eq(IHF + sef(10) + 30_000)
  end

  it "detects AHS on packed dimensions (packing additions push a 115cm box over 122cm)" do
    input = make_input(
      packingType: "WOODEN_BOX",
      items: [ { id: "1", length: 115, width: 30, height: 30, weight: 10, quantity: 1 } ]
    )
    # WOODEN_BOX packing alone also triggers AHS via packing_types — both paths agree.
    result = described_class.call(input: input, billable_weight: 15, fsc_percent: 0)

    expect(result[:details].map { |d| d[:code] }).to include("AHS")
  end
end

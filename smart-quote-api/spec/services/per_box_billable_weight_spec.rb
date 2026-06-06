require "rails_helper"

RSpec.describe QuoteCalculator, "per-box billable weight" do
  let(:base_input) do
    {
      originCountry: "KR",
      destinationCountry: "US",
      destinationZip: "10001",
      incoterm: "DAP",
      packingType: "NONE",
      items: [],
      marginPercent: 15,
      dutyTaxEstimate: 0,
      exchangeRate: 1300,
      fscPercent: 30,
      overseasCarrier: "UPS"
    }
  end

  it "sums per-box chargeable weights for multi-box UPS shipments" do
    result = QuoteCalculator.call(
      base_input.merge(
        items: [
          { id: "A", length: 50, width: 40, height: 30, weight: 5, quantity: 1 },
          { id: "B", length: 10, width: 10, height: 10, weight: 20, quantity: 1 }
        ]
      )
    )

    # Box A: max(5, 50*40*30/5000=12) = 12
    # Box B: max(20, 10*10*10/5000=0.2) = 20
    # Per-box W/T = 32. Legacy max-of-totals would be max(25, 12.2) = 25.
    expect(result[:totalActualWeight]).to eq(25)
    expect(result[:totalVolumetricWeight]).to be_within(0.00001).of(12.2)
    expect(result[:billableWeight]).to eq(32)
  end

  it "rounds each physical box chargeable weight up to 0.5kg before summing" do
    result = QuoteCalculator.call(
      base_input.merge(
        items: [
          { id: "A", length: 30, width: 20, height: 15, weight: 1, quantity: 3 }
        ]
      )
    )

    # Each box: max(1, 30*20*15/5000=1.8) = 1.8 -> 2.0; 2.0 * 3 = 6.0.
    # Legacy max-of-totals would be max(3, 5.4) = 5.4.
    expect(result[:totalActualWeight]).to eq(3)
    expect(result[:totalVolumetricWeight]).to be_within(0.00001).of(5.4)
    expect(result[:billableWeight]).to eq(6)
  end

  it "keeps raw max-of-totals behavior for a single box" do
    result = QuoteCalculator.call(
      base_input.merge(
        items: [
          { id: "A", length: 30, width: 20, height: 15, weight: 1, quantity: 1 }
        ]
      )
    )

    expect(result[:billableWeight]).to be_within(0.00001).of(1.8)
  end
end

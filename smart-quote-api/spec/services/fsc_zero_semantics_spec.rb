require "rails_helper"

# What a supplied fscPercent of 0 means.
#
# 0 is a real "no fuel surcharge"; only a missing value falls back to a default.
# The frontend read this field with `||` until 2026-08-21, which made 0 fall
# through to the carrier default — so the same quote displayed 1,355,800 and was
# stored as 1,020,600. The shared parity fixture `ups_us_fsc_zero_explicit` pins
# the agreed number on both sides; this spec pins the rule itself, including the
# nil branch that the fixture cannot cover (it reads the live FSC table, so a
# seed change would break an unrelated test).
RSpec.describe QuoteCalculator, "fscPercent zero semantics" do
  let(:base_input) do
    {
      originCountry: "KR",
      destinationCountry: "US",
      destinationZip: "10001",
      incoterm: "DAP",
      packingType: "NONE",
      items: [ { id: "1", length: 30, width: 30, height: 30, weight: 10, quantity: 1 } ],
      marginPercent: 0,
      dutyTaxEstimate: 0,
      exchangeRate: 1400,
      overseasCarrier: "UPS"
    }
  end

  it "charges no fuel surcharge when fscPercent is an explicit 0" do
    result = QuoteCalculator.call(base_input.merge(fscPercent: 0))

    expect(result[:breakdown][:intlFsc]).to eq(0)
  end

  it "charges the supplied percentage when one is given" do
    result = QuoteCalculator.call(base_input.merge(fscPercent: 10))

    expect(result[:breakdown][:intlFsc])
      .to eq((result[:breakdown][:intlBase] * 0.1).round)
  end

  context "when fscPercent is absent" do
    before do
      allow(FscFetcher).to receive(:current_rates).and_return(
        { "UPS" => { "international" => 20.0, "domestic" => 20.0 } }
      )
    end

    it "falls back to the live FSC table rather than charging nothing" do
      result = QuoteCalculator.call(base_input)

      expect(result[:breakdown][:intlFsc])
        .to eq((result[:breakdown][:intlBase] * 0.2).round)
    end

    it "still honours an explicit 0 over the live table" do
      result = QuoteCalculator.call(base_input.merge(fscPercent: 0))

      expect(result[:breakdown][:intlFsc]).to eq(0)
    end
  end
end

require "rails_helper"

RSpec.describe Calculators::DhlZone do
  describe "mapped countries" do
    { "JP" => "Z2", "CN" => "Z1", "US" => "Z5", "DE" => "Z6", "AE" => "Z7", "BR" => "Z8" }.each do |country, zone|
      it "maps #{country} to #{zone}" do
        expect(described_class.call(country)[:rate_key]).to eq(zone)
      end
    end

    # DHL's rate sheet does not split China (confirmed 2026-08-19): Southern
    # China ships at the CN (Z1) rate, and the label says so wherever the
    # applied zone is displayed. Mirrors src/config/dhl_zones.ts.
    it "maps CN-S to Z1 at the CN rate, with a self-describing label" do
      expect(described_class.call("CN-S")).to eq(rate_key: "Z1", label: "Z1/Asia (S.China=CN)")
    end
  end

  describe "unmapped countries" do
    # No fallback zone (was Z8 "Rest of World"): an unmapped destination must
    # become 422 ZONE_NOT_FOUND, never a quote priced off a guessed zone.
    it "raises ZoneNotFoundError instead of guessing a zone" do
      expect { described_class.call("ZZ") }.to raise_error(Calculators::ZoneNotFoundError) do |error|
        expect(error.carrier).to eq("DHL")
        expect(error.country).to eq("ZZ")
      end
    end

    # Selectable in the UI but absent from the DHL zone table — must raise, and
    # the frontend shows "no DHL zone" for them.
    %w[XK CW SX].each do |country|
      it "#{country} is absent from the DHL zone table and raises" do
        expect(described_class::ZONE_MAP).not_to have_key(country)
        expect { described_class.call(country) }.to raise_error(Calculators::ZoneNotFoundError)
      end
    end
  end
end

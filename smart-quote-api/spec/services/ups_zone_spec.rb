require "rails_helper"

RSpec.describe Calculators::UpsZone do
  describe "mapped countries" do
    { "US" => "Z5", "JP" => "Z2", "SG" => "Z1", "DE" => "Z6", "CN-S" => "Z10" }.each do |country, zone|
      it "maps #{country} to #{zone}" do
        expect(described_class.call(country)[:rate_key]).to eq(zone)
      end
    end
  end

  describe "unmapped countries" do
    # No fallback zone (was Z10 "Rest of World"): an unmapped destination must
    # become 422 ZONE_NOT_FOUND, never a quote priced off a guessed zone.
    it "raises ZoneNotFoundError instead of guessing a zone" do
      expect { described_class.call("ZZ") }.to raise_error(Calculators::ZoneNotFoundError) do |error|
        expect(error.carrier).to eq("UPS")
        expect(error.country).to eq("ZZ")
      end
    end

    # Selectable in the UI but absent from the UPS zone table — must raise, and
    # the frontend shows "no UPS zone" for them.
    %w[PG FJ XK YE TJ SD SS LY].each do |country|
      it "#{country} is absent from the UPS zone table and raises" do
        expect(described_class::ZONE_MAP).not_to have_key(country)
        expect { described_class.call(country) }.to raise_error(Calculators::ZoneNotFoundError)
      end
    end
  end
end

require "rails_helper"

# The zone letter selects the rate table, so a wrong letter silently changes the
# quoted price. This spec mirrors src/config/__tests__/fedex_zones.test.ts — the
# two tables must not drift apart, or the UI quote and the saved quote disagree.
RSpec.describe Calculators::FedexZone do
  describe "countries corrected against the official FedEx table (2026-08)" do
    {
      "BE" => "M", "NL" => "M",                                  # were G
      "CH" => "G", "IE" => "G", "LU" => "G", "PT" => "G",        # were M
      "MC" => "G", "LI" => "G",                                  # were M
      "IL" => "H",                                               # was G — +17% at 20kg
      "AD" => "H",                                               # was M — +17% at 20kg
      "MP" => "I",                                               # was D — +74% at 20kg
      "NZ" => "U"                                                # was F
    }.each do |country, zone|
      it "maps #{country} to #{zone}" do
        expect(described_class.call(country)[:rate_key]).to eq(zone)
      end
    end
  end

  describe "one representative per zone" do
    {
      "MO" => "A", "GU" => "D", "US" => "F", "AT" => "G", "TR" => "H",
      "BR" => "I", "EG" => "J", "CN-S" => "K", "GB" => "M", "VN" => "N",
      "IN" => "O", "JP" => "P", "MY" => "Q", "TH" => "R", "PH" => "S",
      "ID" => "T", "AU" => "U", "HK" => "V", "CN" => "W", "TW" => "X",
      "SG" => "Y"
    }.each do |country, zone|
      it "maps #{country} to #{zone}" do
        expect(described_class.call(country)[:rate_key]).to eq(zone)
      end
    end
  end

  describe "coverage" do
    it "covers every country listed in the official table" do
      expect(described_class::ZONE_MAP.size).to eq(205)
    end

    it "uses only zone letters that exist in the FedEx tariff" do
      valid = %w[A D E F G H I J K M N O P Q R S T U V W X Y]
      expect(described_class::ZONE_MAP.values.uniq - valid).to be_empty
    end
  end

  describe "unmapped countries" do
    # There is deliberately no fallback zone. Earlier fallbacks (Y/Singapore,
    # then J) both priced unmapped destinations without telling the caller; now
    # an unmapped country raises and the API returns 422 ZONE_NOT_FOUND.
    it "raises ZoneNotFoundError instead of guessing a zone" do
      expect { described_class.call("ZZ") }.to raise_error(Calculators::ZoneNotFoundError) do |error|
        expect(error.carrier).to eq("FEDEX")
        expect(error.country).to eq("ZZ")
      end
    end

    it "returns the mapped zone for countries that are listed" do
      expect(described_class.call("SG")).to eq(rate_key: "Y", label: "Y/Singapore")
    end

    # Countries FedEx does not list. They must stay unmapped — a guessed zone
    # would be worse than no data.
    %w[MM SD SS SL CF KM GW TM TJ XK SM VA].each do |country|
      it "#{country} is absent from the official table and raises" do
        expect(described_class::ZONE_MAP).not_to have_key(country)
        expect { described_class.call(country) }.to raise_error(Calculators::ZoneNotFoundError)
      end
    end
  end
end

require "rails_helper"

RSpec.describe FscRate, type: :model do
  describe ".ensure_defaults!" do
    it "seeds current FSC defaults for UPS and DHL" do
      described_class.delete_all

      described_class.ensure_defaults!

      expect(described_class.find_by(carrier: "UPS")).to have_attributes(
        international: Constants::Rates::DEFAULT_FSC_PERCENT,
        domestic: Constants::Rates::DEFAULT_FSC_PERCENT,
        source: "seed"
      )
      expect(described_class.find_by(carrier: "DHL")).to have_attributes(
        international: Constants::Rates::DEFAULT_FSC_PERCENT_DHL,
        domestic: Constants::Rates::DEFAULT_FSC_PERCENT_DHL,
        source: "seed"
      )
    end

    it "refreshes stale seed values to the current defaults" do
      described_class.create!(
        carrier: "UPS",
        international: 38.5,
        domestic: 36.5,
        source: "seed"
      )
      described_class.create!(
        carrier: "DHL",
        international: 39.0,
        domestic: 37.0,
        source: "seed"
      )

      described_class.ensure_defaults!

      expect(described_class.find_by(carrier: "UPS")).to have_attributes(
        international: Constants::Rates::DEFAULT_FSC_PERCENT,
        domestic: Constants::Rates::DEFAULT_FSC_PERCENT
      )
      expect(described_class.find_by(carrier: "DHL")).to have_attributes(
        international: Constants::Rates::DEFAULT_FSC_PERCENT_DHL,
        domestic: Constants::Rates::DEFAULT_FSC_PERCENT_DHL
      )
    end

    it "does not overwrite manually maintained FSC values" do
      described_class.create!(
        carrier: "UPS",
        international: 47.25,
        domestic: 47.25,
        source: "manual"
      )

      described_class.ensure_defaults!

      expect(described_class.find_by(carrier: "UPS")).to have_attributes(
        international: 99.99,
        domestic: 47.25,
        source: "manual"
      )
    end
  end
end

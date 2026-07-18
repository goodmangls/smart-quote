class FscRate < ApplicationRecord
  include Constants::Rates

  validates :carrier, presence: true, uniqueness: true, inclusion: { in: %w[UPS DHL] }
  validates :international, :domestic, presence: true, numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 100 }

  DEFAULT_SEED_RATES = {
    "UPS" => DEFAULT_FSC_PERCENT.to_f,
    "DHL" => DEFAULT_FSC_PERCENT_DHL.to_f
  }.freeze

  # Seed current default rates if the table is empty. If a row still carries an
  # old seed value, refresh it so read-only widgets stay in sync with pricing.
  def self.ensure_defaults!
    DEFAULT_SEED_RATES.each do |carrier, rate|
      record = find_or_initialize_by(carrier: carrier)

      if record.new_record?
        record.assign_attributes(
          international: rate,
          domestic: rate,
          source: "seed"
        )
        record.save!
        next
      end

      next unless record.source == "seed" && [ record.international.to_f, record.domestic.to_f ] != [ rate, rate ]

      record.update!(
        international: rate,
        domestic: rate
      )
    end
  end

  def self.rates_hash
    ensure_defaults!
    all.each_with_object({}) do |r, h|
      h[r.carrier] = { "international" => r.international.to_f, "domestic" => r.domestic.to_f }
    end
  end
end

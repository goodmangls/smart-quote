class FscFetcher
  include Constants::Rates

  # Fallback rates when DB is unavailable. These must stay aligned with the
  # quote calculator defaults so widgets and calculations show the same FSC.
  DEFAULT_RATES = {
    "UPS" => { "international" => DEFAULT_FSC_PERCENT.to_f, "domestic" => DEFAULT_FSC_PERCENT.to_f },
    "DHL" => { "international" => DEFAULT_FSC_PERCENT_DHL.to_f, "domestic" => DEFAULT_FSC_PERCENT_DHL.to_f },
    "FEDEX" => { "international" => DEFAULT_FSC_PERCENT_FEDEX.to_f, "domestic" => DEFAULT_FSC_PERCENT_FEDEX.to_f }
  }.freeze

  class << self
    def current_rates
      FscRate.rates_hash
    rescue StandardError => e
      Rails.logger.warn("FscFetcher: DB read failed, using defaults: #{e.message}")
      DEFAULT_RATES
    end

    def update!(carrier:, international:, domestic:, updated_by: nil)
      record = FscRate.find_or_initialize_by(carrier: carrier.upcase)
      record.update!(
        international: international,
        domestic: domestic,
        source: "manual",
        updated_by: updated_by
      )
      record
    end
  end
end

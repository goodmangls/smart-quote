# frozen_string_literal: true

module Calculators
  # Raised when the destination country has no zone in the selected carrier's
  # official zone table. There is deliberately no fallback zone — an unmapped
  # destination must become a 422 (ZONE_NOT_FOUND) on the API, never a quote
  # priced off a guessed zone. Mirrors the frontend ZoneNotFoundError.
  class ZoneNotFoundError < StandardError
    attr_reader :carrier, :country

    def initialize(carrier:, country:)
      @carrier = carrier
      @country = country
      super(%(No #{carrier} zone mapping for destination country "#{country}"))
    end
  end
end

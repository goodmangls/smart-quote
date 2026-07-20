# frozen_string_literal: true

module Calculators
  # Mirrors FE rateTableResolver.ts — Document tables only within PDF weight caps.
  class RateTableResolver
    def self.call(carrier:, shipping_item_type:, billable_weight:)
      new(carrier, shipping_item_type, billable_weight).call
    end

    def initialize(carrier, shipping_item_type, billable_weight)
      @carrier = carrier.to_s.upcase
      @shipping_item_type = shipping_item_type.to_s
      @billable_weight = billable_weight.to_f
    end

    def call
      rated = round_to_half(@billable_weight)
      is_document = @shipping_item_type == "DOCUMENT"

      if @carrier == "DHL"
        if is_document && rated <= Constants::DhlTariff::DHL_DOC_MAX_KG
          return {
            exact: Constants::DhlTariff::DHL_DOC_EXACT_RATES,
            range: Constants::DhlTariff::DHL_RANGE_RATES,
            used_document: true
          }
        end
        return {
          exact: Constants::DhlTariff::DHL_EXACT_RATES,
          range: Constants::DhlTariff::DHL_RANGE_RATES,
          used_document: false
        }
      end

      if is_document && rated <= Constants::UpsTariff::UPS_DOC_MAX_KG
        return {
          exact: Constants::UpsTariff::UPS_DOC_EXACT_RATES,
          range: Constants::UpsTariff::UPS_RANGE_RATES,
          used_document: true
        }
      end

      {
        exact: Constants::UpsTariff::UPS_EXACT_RATES,
        range: Constants::UpsTariff::UPS_RANGE_RATES,
        used_document: false
      }
    end

    private

    def round_to_half(num)
      (num * 2).ceil / 2.0
    end
  end
end

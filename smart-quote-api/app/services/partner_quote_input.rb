# frozen_string_literal: true

# Maps a partner API payload to the calculator input hash.
#
# Extracted from QuotesController#normalize_quote_api_params (cyclomatic 19,
# ABC 47.5). Behaviour is unchanged and pinned by
# spec/requests/api/v1/partner_quote_input_spec.rb.
#
# Margin is deliberately NOT resolved here. It depends on the authenticated API
# key, which is request state the controller owns; the caller resolves it and
# passes it in. That also keeps the "a partner must never set its own margin"
# rule visible at the call site rather than buried in a mapper.
class PartnerQuoteInput
  InvalidInput = Class.new(StandardError)

  def initialize(api_params)
    @api = api_params || {}
  end

  # Raises InvalidInput when the payload carries no packages. Exposed because the
  # caller needs them to resolve margin (which bands on declared weight) before it
  # can build the input hash. Weight is computed by the controller's existing
  # helper rather than duplicated here — the two must not drift, since a different
  # weight lands the quote in a different margin band.
  def packages
    @packages ||= begin
      list = @api.dig("cargo", "packages") || []
      raise InvalidInput, "cargo.packages is required" if list.blank?

      list
    end
  end

  def carrier
    @carrier ||= (@api["carrier"].presence || "UPS").upcase
  end

  def to_h(margin_percent:)
    {
      "originCountry" => @api.dig("origin", "country").presence || "KR",
      "destinationCountry" => @api.dig("destination", "country"),
      "destinationZip" => @api.dig("destination", "postal_code") || @api.dig("destination", "airport"),
      "domesticRegionCode" => @api.dig("origin", "domestic_region_code").presence || "A",
      "isJejuPickup" => ActiveModel::Type::Boolean.new.cast(@api.dig("origin", "is_jeju_pickup")),
      "incoterm" => @api.dig("terms", "incoterms").presence || "DAP",
      "packingType" => @api.dig("cargo", "packing_type").presence || "NONE",
      "shippingMode" => @api["service_type"].presence || "express_courier",
      "marginPercent" => margin_percent,
      "dutyTaxEstimate" => (@api.dig("terms", "duty_tax_estimate") || 0).to_f,
      "exchangeRate" => (@api["exchange_rate"].presence || Constants::Rates::DEFAULT_EXCHANGE_RATE).to_f,
      "fscPercent" => fsc_percent.to_f,
      "manualDomesticCost" => pickup_cost,
      "manualPackingCost" => @api.dig("cargo", "manual_packing_cost"),
      "manualSurgeCost" => (@api["manual_surcharge_cost"] || 0).to_f,
      "overseasCarrier" => carrier,
      "items" => packages.map.with_index(1) { |package, idx| normalize_package(package, idx) }
    }
  end

  private

  # Explicit value wins; otherwise the live FSC table; otherwise the per-carrier
  # constant.
  def fsc_percent
    @api["fsc_percent"].presence ||
      FscFetcher.current_rates.dig(carrier, "international") ||
      carrier_default_fsc
  end

  def carrier_default_fsc
    carrier == "DHL" ? Constants::Rates::DEFAULT_FSC_PERCENT_DHL : Constants::Rates::DEFAULT_FSC_PERCENT
  end

  # Only billed when the partner asked for pickup.
  def pickup_cost
    return 0 unless @api.dig("terms", "pickup_required")

    (@api.dig("terms", "pickup_cost") || 0).to_f
  end

  def normalize_package(package, idx)
    {
      "id" => package["id"].presence || "api-package-#{idx}",
      "name" => package["name"].presence || "Package #{idx}",
      "quantity" => (package["quantity"].presence || 1).to_i,
      "weight" => package["gross_weight_kg"].to_f,
      "length" => package["length_cm"].to_f,
      "width" => package["width_cm"].to_f,
      "height" => package["height_cm"].to_f
    }
  end
end

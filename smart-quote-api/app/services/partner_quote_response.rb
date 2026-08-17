# frozen_string_literal: true

# Response envelope + audit metadata for the partner quote API
# (POST /api/v1/quote_api/quotes). The partner-facing contract lives here in
# one testable object instead of inline controller methods.
class PartnerQuoteResponse
  def self.body(quote:, result:, api_params:, api_key: nil)
    new(api_params: api_params, api_key: api_key).body(quote: quote, result: result)
  end

  def self.audit_metadata(api_params:, api_key: nil)
    new(api_params: api_params, api_key: api_key).audit_metadata
  end

  # Declared totals over the raw partner packages (quantity/gross_weight_kg/
  # *_cm keys). Also used to band margin rules before QuoteCalculator has run.
  def self.gross_weight(packages)
    packages.sum { |p| p["quantity"].to_i * p["gross_weight_kg"].to_f }.round(2)
  end

  def self.volume_weight(packages)
    packages.sum { |p| p["quantity"].to_i * p["length_cm"].to_f * p["width_cm"].to_f * p["height_cm"].to_f / 5000.0 }.ceil.to_f
  end

  def initialize(api_params:, api_key: nil)
    @api = api_params || {}
    @api_key = api_key
  end

  def body(quote:, result:)
    packages = @api.dig("cargo", "packages") || []
    {
      quote_id: quote.reference_no,
      status: "quoted",
      service: {
        provider: "BridgeLogis",
        service_name: "BridgeLogis Express Courier",
        carrier: quote.carrier || quote.overseas_carrier
      },
      route: {
        origin_country: quote.origin_country,
        origin_city: @api.dig("origin", "city"),
        destination_country: quote.destination_country,
        destination_city: @api.dig("destination", "city"),
        destination_airport: @api.dig("destination", "airport")
      },
      cargo_summary: {
        packages: packages.sum { |p| p["quantity"].to_i },
        gross_weight_kg: self.class.gross_weight(packages),
        volume_weight_kg: self.class.volume_weight(packages),
        chargeable_weight_kg: result[:billableWeight].to_f
      },
      pricing: {
        currency: "USD",
        total: result[:totalQuoteAmountUSD].to_f.round(2)
      },
      transit_time: {
        value: result[:transitTime],
        unit: "business_days"
      },
      conditions: [
        "Subject to final pickup availability.",
        "Subject to customs requirements and commodity acceptance.",
        "Subject to final carrier confirmation at booking."
      ],
      valid_until: quote.validity_date&.iso8601,
      created_at: quote.created_at.iso8601
    }
  end

  def audit_metadata
    {
      source: "quote_api_v1",
      partner_api_key_id: @api_key&.id,
      partner_name: @api_key&.name,
      requested_by: @api["requested_by"],
      service_type: @api["service_type"],
      carrier: @api["carrier"]
    }
  end
end

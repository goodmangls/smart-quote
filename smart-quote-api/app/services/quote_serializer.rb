class QuoteSerializer
  def self.summary(quote)
    {
      id: quote.id,
      referenceNo: quote.reference_no,
      destinationCountry: quote.destination_country,
      totalQuoteAmount: quote.total_quote_amount.to_i,
      totalQuoteAmountUsd: quote.total_quote_amount_usd.to_f.round(2),
      profitMargin: quote.profit_margin.to_f,
      billableWeight: quote.billable_weight.to_f,
      domesticTruckType: quote.domestic_truck_type,
      status: quote.status,
      customerName: quote.customer&.company_name,
      validityDate: quote.validity_date&.iso8601,
      surchargeStale: surcharge_stale?(quote),
      createdAt: quote.created_at.iso8601
    }
  end

  def self.detail(quote)
    {
      id: quote.id,
      referenceNo: quote.reference_no,
      status: quote.status,
      notes: quote.notes,
      createdAt: quote.created_at.iso8601,
      updatedAt: quote.updated_at.iso8601,
      # Input
      originCountry: quote.origin_country,
      destinationCountry: quote.destination_country,
      destinationZip: quote.destination_zip,
      domesticRegionCode: quote.domestic_region_code,
      isJejuPickup: quote.is_jeju_pickup,
      incoterm: quote.incoterm,
      packingType: quote.packing_type,
      shippingItemType: quote.shipping_item_type,
      marginPercent: quote.margin_percent.to_f,
      dutyTaxEstimate: quote.duty_tax_estimate.to_i,
      exchangeRate: quote.exchange_rate.to_f,
      fscPercent: quote.fsc_percent.to_f,
      manualDomesticCost: quote.manual_domestic_cost&.to_i,
      manualPackingCost: quote.manual_packing_cost&.to_i,
      items: quote.items,
      # Result
      totalQuoteAmount: quote.total_quote_amount.to_i,
      totalQuoteAmountUSD: quote.total_quote_amount_usd.to_f.round(2),
      totalCostAmount: quote.total_cost_amount.to_i,
      profitAmount: quote.profit_amount.to_i,
      profitMargin: quote.profit_margin.to_f,
      billableWeight: quote.billable_weight.to_f,
      appliedZone: quote.applied_zone,
      domesticTruckType: quote.domestic_truck_type,
      warnings: quote.warnings,
      breakdown: quote.breakdown,
      customerId: quote.customer_id,
      customerName: quote.customer&.company_name,
      validityDate: quote.validity_date&.iso8601
    }
  end

  # Payload for the PUBLIC share link (`GET /shared/:token`, no authentication).
  #
  # Whitelisted on purpose. This used to render `detail`, which shipped
  # `totalCostAmount`, `profitAmount`, `profitMargin` and `marginPercent` to
  # whoever held the link — normally the customer being quoted. Nothing on the
  # page displayed them, so the leak lived entirely in the response body.
  #
  # ⚠️ Never widen this by subtracting keys from `detail`: a field added there
  # later would start leaking by default. Anything a customer may see has to be
  # named here deliberately. Mirrors `SharedQuoteData` in `src/api/shareApi.ts`.
  def self.shared(quote)
    {
      referenceNo: quote.reference_no,
      originCountry: quote.origin_country,
      destinationCountry: quote.destination_country,
      destinationZip: quote.destination_zip,
      overseasCarrier: quote.overseas_carrier,
      totalQuoteAmount: quote.total_quote_amount.to_i,
      totalQuoteAmountUsd: quote.total_quote_amount_usd.to_f.round(2),
      appliedZone: quote.applied_zone,
      transitTime: quote.transit_time,
      incoterm: quote.incoterm,
      billableWeight: quote.billable_weight.to_f,
      createdAt: quote.created_at.iso8601,
      validityDate: quote.validity_date&.iso8601
    }
  end

  def self.surcharge_stale?(quote)
    return false unless quote.status.in?(%w[draft sent])
    return false unless quote.breakdown.is_a?(Hash)

    stored = quote.breakdown["appliedSurcharges"] || []
    return false if stored.empty?

    carrier = quote.breakdown.dig("carrier") || quote.overseas_carrier
    country = quote.destination_country
    zone = quote.applied_zone

    current = SurchargeResolver.resolve(carrier: carrier, country: country, zone: zone)

    stored_codes = stored.map { |s| s["code"] }.sort
    current_codes = current.map { |s| s[:code] }.sort

    return true if stored_codes != current_codes

    stored_total = stored.sum { |s| s["appliedAmount"].to_f }
    current_total = current.sum { |s| s[:applied_amount].to_f }
    stored_total != current_total
  rescue => e
    Rails.logger.warn "[SURCHARGE_STALE] Error checking: #{e.message}"
    false
  end
end

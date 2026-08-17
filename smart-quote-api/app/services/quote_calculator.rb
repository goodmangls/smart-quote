class QuoteCalculator
  include Constants::Rates
  include Constants::BusinessRules

  def self.call(input)
    new(input).call
  end

  def initialize(input)
    @input = input.deep_symbolize_keys
  end

  def call
    @carrier = @input[:overseasCarrier] || "UPS"
    @user_warnings = []

    calculate_items
    calculate_overseas
    calculate_surcharges
    calculate_totals

    build_result
  end

  private

  def calculate_items
    volumetric_divisor = 5000
    @item_result = Calculators::ItemCost.call(
      items: @input[:items],
      packing_type: @input[:packingType] || "NONE",
      manual_packing_cost: @input[:manualPackingCost],
      volumetric_divisor: volumetric_divisor,
      carrier: @carrier
    )

    @packing_fumigation_cost = 0
    if (@input[:packingType] || "NONE") != "NONE"
      @packing_fumigation_cost = FUMIGATION_FEE
    end
    if @input[:manualPackingCost] && @input[:manualPackingCost] >= 0
      @packing_fumigation_cost = 0
    end

    @packing_total = @item_result[:packing_material_cost] + @item_result[:packing_labor_cost] + @packing_fumigation_cost

    # Global express billing (UPS/DHL): for multi-box shipments (2+ physical boxes),
    # calculate each box's chargeable weight independently, round each box up to
    # the 0.5kg rating increment, then sum. A single box keeps the legacy raw
    # max-of-totals behavior unchanged.
    total_box_count = (@input[:items] || []).sum { |item| item[:quantity].to_i }
    raw_billable_weight = if total_box_count >= 2
      @item_result[:total_billable_weight]
    else
      [ @item_result[:total_actual_weight], @item_result[:total_packed_volumetric_weight] ].max
    end
    @user_warnings = @item_result[:warnings].dup

    # FedEx rates a package meeting the 추가 취급 요금 – 용적 criteria at no less than
    # 18kg. The surcharge is flat, so the rule lands on the tariff lookup below.
    # nil unless a package actually triggers it — other carriers are untouched.
    fedex_min_chargeable = if @carrier == "FEDEX"
      Calculators::FedexAddon.min_chargeable_weight(@input[:items], @input[:packingType] || "NONE")
    end
    @billable_weight = fedex_min_chargeable ? [ raw_billable_weight, fedex_min_chargeable ].max : raw_billable_weight

    if fedex_min_chargeable && @billable_weight > raw_billable_weight
      @user_warnings << "FedEx Minimum Chargeable Weight: rated at #{@billable_weight}kg " \
                        "(actual #{raw_billable_weight}kg) — package meets the Additional Handling – Dimension criteria."
    end

    if @item_result[:total_packed_volumetric_weight] > @item_result[:total_actual_weight] * 1.2
      @user_warnings << "High Volumetric Weight Detected (>20% over actual). Consider Repacking."
    end
  end

  def calculate_overseas
    shipping_item_type = @input[:shippingItemType] || "NON_DOCUMENT"

    @overseas_result = case @carrier
    when "DHL"
                         Calculators::DhlCost.call(
                           billable_weight: @billable_weight,
                           country: @input[:destinationCountry],
                           shipping_item_type: shipping_item_type
                         )
    when "FEDEX"
                         Calculators::FedexCost.call(
                           billable_weight: @billable_weight,
                           country: @input[:destinationCountry],
                           shipping_item_type: shipping_item_type
                         )
    else
                         Calculators::UpsCost.call(
                           billable_weight: @billable_weight,
                           country: @input[:destinationCountry],
                           shipping_item_type: shipping_item_type
                         )
    end

    if shipping_item_type == "DOCUMENT"
      if @carrier == "DHL" && @billable_weight > Constants::DhlTariff::DHL_DOC_MAX_KG
        @user_warnings << "Document rates apply up to 2.0kg on DHL; Parcel tariff used for this weight."
      elsif @carrier == "FEDEX" && @billable_weight > Constants::FedexTariff::FEDEX_DOC_MAX_KG
        @user_warnings << "Document rates apply up to 2.5kg on FedEx (Envelope/Pak); IP Parcel tariff used for this weight."
      elsif @carrier == "UPS" && @billable_weight > Constants::UpsTariff::UPS_DOC_MAX_KG
        @user_warnings << "Document rates apply up to 5.0kg on UPS; Parcel tariff used for this weight."
      end
    end
  end

  def calculate_surcharges
    @db_fsc_rates = FscFetcher.current_rates

    surcharge_result = SurchargeResolver.calculate_total(
      carrier: @carrier,
      country: @input[:destinationCountry],
      zone: @overseas_result[:applied_zone],
      intl_base: @overseas_result[:intl_base]
    )
    @system_surcharge_total = surcharge_result[:total]
    @applied_surcharges = surcharge_result[:applied]

    # UPS Surge Fee lives in the UPS add-on mirror (Calculators::UpsAddon,
    # code SGF) — same bucket as the frontend — so the surge total here is
    # system surcharges + manual only, matching intlSurge on the FE breakdown.
    @manual_surge_cost = @input[:manualSurgeCost] || 0
    @surge_cost = @system_surcharge_total + @manual_surge_cost

    @dest_duty = @input[:incoterm] == "DDP" ? (@input[:dutyTaxEstimate] || 0) : 0
    @pickup_in_seoul = @input[:pickupInSeoulCost] || 0
  end

  def calculate_totals
    exchange_rate = @input[:exchangeRate] || DEFAULT_EXCHANGE_RATE
    @safe_margin_percent = [ (@input[:marginPercent] || 15).to_f, 0 ].max.clamp(0, MAX_MARGIN_PERCENT)
    base_rate = @overseas_result[:intl_base]

    # Markup on Base Rate (cost × (1 + margin%))
    @base_with_margin = base_rate * (1 + @safe_margin_percent / 100.0)
    @margin_amount = @base_with_margin - base_rate

    # FSC on (Base Rate + Margin)
    if @input[:fscPercent].nil?
      default_fsc = @db_fsc_rates.dig(@carrier, "international") ||
                    case @carrier
                    when "DHL" then DEFAULT_FSC_PERCENT_DHL
                    when "FEDEX" then DEFAULT_FSC_PERCENT_FEDEX
                    else DEFAULT_FSC_PERCENT
                    end
      fsc_percent = default_fsc
    else
      fsc_percent = @input[:fscPercent].to_f
    end
    fsc_rate = fsc_percent / 100.0
    @intl_fsc_new = (@base_with_margin * fsc_rate).round

    # Add-ons (no margin applied)
    #
    # All three carriers mirror their frontend add-on calculators here, so a
    # saved quote matches the figure the customer was shown. (UPS/DHL joined
    # FedEx 2026-08-17 — before that their saved totals sat ~5% below the
    # displayed ones; already-saved quotes keep their stored amounts.)
    add_on = carrier_add_on_result
    @carrier_add_on_total = add_on ? add_on[:total] : 0
    @carrier_add_on_details = add_on && add_on[:details].any? ? add_on[:details] : nil

    add_on_total = @packing_total + @pickup_in_seoul + @surge_cost + @carrier_add_on_total +
                   @dest_duty + @overseas_result[:intl_war_risk]

    if [ "EXW", "FOB" ].include?(@input[:incoterm])
      @user_warnings << "Collect Term: International Freight calculated for reference but may be billed to Consignee/Partner."
    end

    cost_fsc = (base_rate * fsc_rate).round
    @total_cost_amount = base_rate + cost_fsc + @overseas_result[:intl_war_risk] + @surge_cost +
                         @packing_total + @carrier_add_on_total + @dest_duty + @pickup_in_seoul
    raw_quote_amount = @base_with_margin + @intl_fsc_new + add_on_total
    @total_quote_amount = (raw_quote_amount / 100.0).ceil * 100
    @total_quote_amount_usd = @total_quote_amount / exchange_rate.to_f

    if @safe_margin_percent < 10
      @user_warnings << "Low Margin Alert: Profit margin is below 10%. Approval required."
    end
  end

  def build_result
    {
      totalQuoteAmount: @total_quote_amount,
      totalQuoteAmountUSD: @total_quote_amount_usd,
      totalCostAmount: @total_cost_amount,
      profitAmount: @margin_amount,
      profitMargin: @safe_margin_percent.round(2),
      currency: "KRW",
      totalActualWeight: @item_result[:total_actual_weight],
      totalVolumetricWeight: @item_result[:total_packed_volumetric_weight],
      billableWeight: @billable_weight,
      appliedZone: @overseas_result[:applied_zone],
      transitTime: @overseas_result[:transit_time],
      carrier: @carrier,
      warnings: @user_warnings,
      breakdown: {
        packingMaterial: @item_result[:packing_material_cost],
        packingLabor: @item_result[:packing_labor_cost],
        packingFumigation: @packing_fumigation_cost,
        handlingFees: 0,
        intlBase: @overseas_result[:intl_base],
        intlFsc: @intl_fsc_new,
        intlWarRisk: @overseas_result[:intl_war_risk],
        intlSurge: @surge_cost,
        intlManualSurge: @manual_surge_cost,
        intlSystemSurcharge: @system_surcharge_total,
        appliedSurcharges: @applied_surcharges.map { |s|
          { code: s[:code], name: s[:name], nameKo: s[:name_ko], amount: s[:applied_amount], chargeType: s[:charge_type], sourceUrl: s[:source_url] }
        },
        pickupInSeoul: @pickup_in_seoul,
        destDuty: @dest_duty,
        carrierAddOnTotal: @carrier_add_on_total,
        carrierAddOnDetails: @carrier_add_on_details,
        totalCost: @total_cost_amount
      }
    }
  end

  # Add-ons take the raw request fscPercent, matching the frontend calls
  # (`calculate*AddOnCosts(input, billableWeight, input.fscPercent)`): when the
  # request omits it, add-ons carry no fuel surcharge even though the
  # international leg falls back to the carrier default. That asymmetry exists
  # on the frontend — mirrored here deliberately so FE and BE agree.
  def carrier_add_on_result
    calculator = case @carrier
    when "FEDEX" then Calculators::FedexAddon
    when "DHL" then Calculators::DhlAddon
    else Calculators::UpsAddon
    end

    calculator.call(
      input: @input,
      billable_weight: @billable_weight,
      fsc_percent: @input[:fscPercent]
    )
  end
end

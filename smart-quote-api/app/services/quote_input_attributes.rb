# frozen_string_literal: true

# Maps a calculator input hash to Quote column attributes.
#
# Extracted from QuotesController#input_attributes, which carried a cyclomatic
# complexity of 28 — one branch per `input["x"] || input[:x] || default` chain,
# eighteen of them in a row. The rules are unchanged; they are data here instead
# of control flow.
#
# Lookup order per field, preserved exactly from the original:
#   1. string key
#   2. symbol key
#   3. default
# `||` decides, so only nil and false fall through — a supplied 0 or "" is kept.
class QuoteInputAttributes
  # column => [input key, default]. A nil default means the column may end up nil
  # (the original had no third term for these).
  FIELDS = {
    origin_country: [ "originCountry", "KR" ],
    destination_country: [ "destinationCountry", nil ],
    destination_zip: [ "destinationZip", nil ],
    domestic_region_code: [ "domesticRegionCode", "A" ],
    is_jeju_pickup: [ "isJejuPickup", false ],
    incoterm: [ "incoterm", nil ],
    packing_type: [ "packingType", "NONE" ],
    shipping_item_type: [ "shippingItemType", "NON_DOCUMENT" ],
    margin_percent: [ "marginPercent", 15 ],
    duty_tax_estimate: [ "dutyTaxEstimate", 0 ],
    exchange_rate: [ "exchangeRate", nil ],
    fsc_percent: [ "fscPercent", nil ],
    manual_domestic_cost: [ "manualDomesticCost", nil ],
    manual_packing_cost: [ "manualPackingCost", nil ],
    manual_surge_cost: [ "manualSurgeCost", 0 ],
    pickup_in_seoul_cost: [ "pickupInSeoulCost", 0 ],
    overseas_carrier: [ "overseasCarrier", "UPS" ]
  }.freeze

  def self.call(input)
    new(input).call
  end

  def initialize(input)
    @input = input || {}
  end

  def call
    FIELDS.each_with_object({}) do |(column, (key, default)), attrs|
      attrs[column] = @input[key] || @input[key.to_sym] || default
    end
  end
end

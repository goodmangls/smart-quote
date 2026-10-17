# Customer-facing projection of a QuoteCalculator result, for every caller who
# is not an admin (anonymous, invalid token, member).
#
# An allowlist, not a denylist: the calculator's output carries cost and margin
# (totalCostAmount, profitAmount, profitMargin, breakdown.*), and a key added to
# the calculator later stays out of the public response until someone decides
# it is customer-facing.
class PublicQuoteResponse
  KEYS = %i[
    totalQuoteAmount
    totalQuoteAmountUSD
    currency
    billableWeight
    totalActualWeight
    totalVolumetricWeight
    appliedZone
    transitTime
    carrier
    appliedFscPercent
  ].freeze

  # Warnings are free text, so they are filtered by content rather than dropped
  # wholesale. "High Volumetric Weight…" is still useful to a customer; the
  # "Low Margin Alert…" message is not.
  REVEALING_WARNING = /margin|profit|cost/i

  def self.call(result)
    result.slice(*KEYS).merge(
      warnings: Array(result[:warnings]).reject { |warning| warning.match?(REVEALING_WARNING) }
    )
  end
end

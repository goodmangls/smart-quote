# frozen_string_literal: true

require "rails_helper"

# WAR_RISK_SURCHARGE_RATE is 0 (DEC-006 removed the surcharge), and 0 is the one
# value that is identical in every unit system. That hid a real split: the
# frontend read the constant as a percentage — `base * (RATE / 100)` — while
# these calculators read it as a fraction — `base * RATE`. Both produced 0, so
# every test, the parity fixtures and the new snapshot gate all passed while the
# two sides disagreed by 100x. Setting it to 2 meaning "2%" would have billed 2%
# on screen and 200% on the saved quote, which is the side customers are invoiced
# from.
#
# So this pins the unit with a NON-ZERO rate. The frontend asserts the same
# number for the same input in
# src/features/quote/services/__tests__/warRiskUnit.test.ts — the pair is the
# gate; either one alone only proves a side is self-consistent.
RSpec.describe "war risk surcharge unit", type: :model do
  # Shared with the frontend test. Deliberately not 0 and not 100: both of those
  # give the same answer under either reading and would prove nothing.
  RATE_PERCENT = 2.0
  BASE = 100_000.0
  EXPECTED = 2_000.0 # 2% of 100,000 — not 200,000, which the fraction reading gives

  # `before`, not `around`: rspec-mocks refuses stub_const outside the per-test
  # lifecycle, and an `around` hook runs outside it.
  before { stub_const("Constants::Rates::WAR_RISK_SURCHARGE_RATE", RATE_PERCENT) }

  # US is served by all three carriers, so the zone lookup succeeds and the
  # calculators reach the war-risk line.
  {
    "UPS" => Calculators::UpsCost,
    "DHL" => Calculators::DhlCost,
    "FEDEX" => Calculators::FedexCost
  }.each do |carrier, klass|
    it "#{carrier} treats the rate as a percentage, not a fraction" do
      result = klass.call(billable_weight: 1, country: "US")

      ratio = result[:intl_war_risk] / result[:intl_base]

      expect(ratio).to be_within(1e-9).of(RATE_PERCENT / 100.0),
        "#{carrier} applied the war-risk rate as a fraction (#{ratio}) instead of a " \
        "percentage (#{RATE_PERCENT / 100.0}). The frontend divides by 100 — see " \
        "src/features/quote/services/upsCalculation.ts — so this side must too."
    end
  end

  it "matches the number the frontend test asserts for the same input" do
    expect(BASE * (RATE_PERCENT / 100.0)).to eq(EXPECTED)
  end
end

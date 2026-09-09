# frozen_string_literal: true

# Canonical dump of the carrier tariff tables AND the mirrored rate constants,
# shared with the frontend as shared/tariff-snapshots/tariffs.json. Both sides
# assert full deep-equality against that file, so a value edited on one side
# only fails CI instead of silently skewing quotes (the per-fixture parity spec
# samples ~15 cells; this covers every cell of every table).
#
# Update flow when rates change:
#   1. Edit lib/constants/*_tariff.rb or rates.rb (backend is the source of truth)
#   2. bin/rails tariff:snapshot   (regenerates the shared JSON)
#   3. Mirror the change in src/config/*_tariff.ts or rates.ts
#   4. rspec spec/lib/tariff_snapshot_parity_spec.rb + vitest tariffParity
class TariffSnapshot
  SNAPSHOT_PATH = File.expand_path("../../shared/tariff-snapshots/tariffs.json", __dir__)

  def self.build
    {
      "ups" => {
        "UPS_EXACT_RATES" => canonical(Constants::UpsTariff::UPS_EXACT_RATES),
        "UPS_RANGE_RATES" => canonical(Constants::UpsTariff::UPS_RANGE_RATES),
        "UPS_DOC_EXACT_RATES" => canonical(Constants::UpsTariff::UPS_DOC_EXACT_RATES),
        "UPS_DOC_MAX_KG" => Constants::UpsTariff::UPS_DOC_MAX_KG
      },
      "dhl" => {
        "DHL_EXACT_RATES" => canonical(Constants::DhlTariff::DHL_EXACT_RATES),
        "DHL_RANGE_RATES" => canonical(Constants::DhlTariff::DHL_RANGE_RATES),
        "DHL_DOC_EXACT_RATES" => canonical(Constants::DhlTariff::DHL_DOC_EXACT_RATES),
        "DHL_DOC_MAX_KG" => Constants::DhlTariff::DHL_DOC_MAX_KG
      },
      "fedex" => {
        "FEDEX_EXACT_RATES" => canonical(Constants::FedexTariff::FEDEX_EXACT_RATES),
        "FEDEX_RANGE_RATES" => canonical(Constants::FedexTariff::FEDEX_RANGE_RATES),
        "FEDEX_ENVELOPE_EXACT_RATES" => canonical(Constants::FedexTariff::FEDEX_ENVELOPE_EXACT_RATES),
        "FEDEX_PAK_EXACT_RATES" => canonical(Constants::FedexTariff::FEDEX_PAK_EXACT_RATES),
        "FEDEX_DOC_MAX_KG" => Constants::FedexTariff::FEDEX_DOC_MAX_KG,
        "FEDEX_ENVELOPE_MAX_KG" => Constants::FedexTariff::FEDEX_ENVELOPE_MAX_KG
      },
      # rates.rb ↔ src/config/rates.ts. These were the one mirrored pair with no
      # drift gate: the tariff tables have this snapshot and the calculation has
      # shared/test-fixtures/calculation-parity.json, but the FX and FSC
      # constants were guarded only by `fx-apply.py --check` — a personal skill
      # outside the repo, so CI never ran it and a contributor without that
      # skill got no signal at all. DEFAULT_EXCHANGE_RATE multiplies every USD
      # figure a customer sees and moves weekly, which is exactly the shape of
      # the drift that left smart-quote-emax five months stale.
      #
      # Money-affecting values only. The *_URL constants are mirrored too but a
      # divergence there changes no quote, so they stay out rather than making
      # this gate noisy enough to be regenerated without reading.
      "rates" => {
        "FUMIGATION_FEE" => Constants::Rates::FUMIGATION_FEE,
        "WAR_RISK_SURCHARGE_RATE" => Constants::Rates::WAR_RISK_SURCHARGE_RATE,
        "PACKING_MATERIAL_BASE_COST" => Constants::Rates::PACKING_MATERIAL_BASE_COST,
        "PACKING_LABOR_UNIT_COST" => Constants::Rates::PACKING_LABOR_UNIT_COST,
        "DEFAULT_EXCHANGE_RATE" => Constants::Rates::DEFAULT_EXCHANGE_RATE,
        "DEFAULT_FSC_PERCENT" => Constants::Rates::DEFAULT_FSC_PERCENT,
        "DEFAULT_FSC_PERCENT_DHL" => Constants::Rates::DEFAULT_FSC_PERCENT_DHL,
        "DEFAULT_FSC_PERCENT_FEDEX" => Constants::Rates::DEFAULT_FSC_PERCENT_FEDEX,
        # Lives in src/config/business-rules.ts on the frontend, not rates.ts —
        # the gate found this pair drifting-capable precisely because the file
        # names differ, so nobody comparing rates.rb to rates.ts would see it.
        # MAX_RULE_MARGIN_PERCENT is deliberately absent: it caps stored
        # MarginRule rows in a server-side validation and has no frontend
        # counterpart, so there is nothing to mirror and listing it here would
        # only force an unused constant into the bundle.
        "MAX_MARGIN_PERCENT" => Constants::Rates::MAX_MARGIN_PERCENT
      }
    }
  end

  # Deep-normalizes so Ruby and TypeScript dumps are byte-comparable:
  # numeric hash keys become strings without a trailing ".0" (0.5 -> "0.5",
  # 5 -> "5"), object keys are sorted, array order is preserved.
  def self.canonical(value)
    case value
    when Hash
      value.map { |k, v| [ normalize_key(k), canonical(v) ] }.sort_by(&:first).to_h
    when Array
      value.map { |v| canonical(v) }
    else
      value
    end
  end

  def self.normalize_key(key)
    return key.to_s unless key.is_a?(Numeric)

    (key == key.to_i ? key.to_i : key).to_s
  end
end

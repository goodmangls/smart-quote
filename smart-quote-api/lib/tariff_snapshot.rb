# frozen_string_literal: true

# Canonical dump of the carrier tariff tables, shared with the frontend as
# shared/tariff-snapshots/tariffs.json. Both sides assert full deep-equality
# against that file, so a rate edited on one side only fails CI instead of
# silently skewing quotes (the per-fixture parity spec samples ~15 cells; this
# covers every cell of every table).
#
# Update flow when rates change:
#   1. Edit lib/constants/*_tariff.rb (backend is the source of truth)
#   2. bin/rails tariff:snapshot   (regenerates the shared JSON)
#   3. Mirror the change in src/config/*_tariff.ts
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

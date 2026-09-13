# frozen_string_literal: true

require "rails_helper"
require "json"

# Full drift gate: every cell of every tariff table AND every mirrored rate
# constant must match the committed shared snapshot (which the frontend asserts
# against in src/config/__tests__/tariffParity.test.ts). Editing
# lib/constants/*_tariff.rb or lib/constants/rates.rb without running
# `bin/rails tariff:snapshot` fails here; editing the frontend side alone fails
# the vitest side.
RSpec.describe TariffSnapshot do
  it "backend tariff and rate constants match the committed shared snapshot" do
    expect(File).to exist(TariffSnapshot::SNAPSHOT_PATH),
      "shared/tariff-snapshots/tariffs.json missing — run: bin/rails tariff:snapshot"

    snapshot = JSON.parse(File.read(TariffSnapshot::SNAPSHOT_PATH))

    # The message names both source pairs on purpose: the rates section was added
    # 2026-09-09 and a message that only mentions the tariff tables would send
    # someone editing rates.rb to the wrong files.
    expect(described_class.build).to eq(snapshot),
      "Constants drifted from the shared snapshot. If the backend was updated " \
      "intentionally, run `bin/rails tariff:snapshot`, then mirror the change on " \
      "the frontend: tariff tables in src/config/*_tariff.ts, rate constants in " \
      "src/config/rates.ts (MAX_MARGIN_PERCENT lives in src/config/business-rules.ts)."
  end
end

# frozen_string_literal: true

require "rails_helper"
require "json"

# Full-table drift gate: every cell of every tariff table must match the
# committed shared snapshot (which the frontend asserts against in
# src/config/__tests__/tariffParity.test.ts). Editing lib/constants/*_tariff.rb
# without running `bin/rails tariff:snapshot` fails here; editing the frontend
# tables alone fails the vitest side.
RSpec.describe TariffSnapshot do
  it "backend tariff constants match the committed shared snapshot" do
    expect(File).to exist(TariffSnapshot::SNAPSHOT_PATH),
      "shared/tariff-snapshots/tariffs.json missing — run: bin/rails tariff:snapshot"

    snapshot = JSON.parse(File.read(TariffSnapshot::SNAPSHOT_PATH))

    expect(described_class.build).to eq(snapshot),
      "Tariff constants drifted from the shared snapshot. " \
      "If the .rb tables were intentionally updated, run `bin/rails tariff:snapshot` " \
      "and mirror the change in src/config/*_tariff.ts."
  end
end

# frozen_string_literal: true

namespace :tariff do
  desc "Regenerate shared/tariff-snapshots/tariffs.json from lib/constants/*_tariff.rb"
  task snapshot: :environment do
    require "json"
    require "fileutils"

    path = TariffSnapshot::SNAPSHOT_PATH
    FileUtils.mkdir_p(File.dirname(path))
    File.write(path, JSON.pretty_generate(TariffSnapshot.build) + "\n")
    puts "Wrote #{path}"
  end
end

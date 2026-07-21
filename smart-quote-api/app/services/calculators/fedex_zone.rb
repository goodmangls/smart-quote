# frozen_string_literal: true

module Calculators
  class FedexZone
    # Synced with frontend src/config/fedex_zones.ts
    # Source: FDX IP Export 2026 Special Rates (letter zones A–Y)
    ZONE_MAP = {
      # A: Macao
      "MO" => "A",
      # D: Guam, Saipan, Laos, Mongolia, Brunei
      "GU" => "D", "MP" => "D", "LA" => "D", "MN" => "D", "BN" => "D",
      # F: US, Canada, NZ, Mexico (E = US West unused without ZIP)
      "US" => "F", "CA" => "F", "NZ" => "F", "MX" => "F",
      # G: N.Europe + Israel
      "AT" => "G", "DK" => "G", "HU" => "G", "BE" => "G", "CZ" => "G",
      "GR" => "G", "NL" => "G", "PL" => "G", "IL" => "G",
      # H: E.Europe
      "RU" => "H", "RO" => "H", "TR" => "H", "BG" => "H",
      "UA" => "H", "BY" => "H", "MD" => "H",
      # I: LatAm
      "AR" => "I", "BR" => "I", "CL" => "I", "PY" => "I", "PE" => "I",
      "CO" => "I", "EC" => "I", "VE" => "I", "UY" => "I", "BO" => "I",
      # J: Middle East
      "AE" => "J", "BH" => "J", "KW" => "J", "OM" => "J", "QA" => "J",
      "SA" => "J", "JO" => "J", "LB" => "J", "EG" => "J", "IQ" => "J",
      # K: China South
      "CN-S" => "K",
      # M: W.Europe
      "IT" => "M", "ES" => "M", "GB" => "M", "DE" => "M", "FR" => "M",
      "CH" => "M", "PT" => "M", "IE" => "M", "LU" => "M", "AD" => "M",
      "MC" => "M", "SM" => "M", "VA" => "M", "LI" => "M",
      # Single-country zones
      "VN" => "N", "IN" => "O", "JP" => "P", "MY" => "Q", "TH" => "R",
      "PH" => "S", "ID" => "T", "AU" => "U", "HK" => "V", "CN" => "W",
      "TW" => "X", "SG" => "Y"
    }.freeze

    ZONE_LABELS = {
      "A" => "A/Macao",
      "D" => "D/Guam-SEA",
      "E" => "E/US West",
      "F" => "F/Americas-Oceania",
      "G" => "G/N.Europe",
      "H" => "H/E.Europe",
      "I" => "I/LatAm",
      "J" => "J/Middle East",
      "K" => "K/S.China",
      "M" => "M/W.Europe",
      "N" => "N/Vietnam",
      "O" => "O/India",
      "P" => "P/Japan",
      "Q" => "Q/Malaysia",
      "R" => "R/Thailand",
      "S" => "S/Philippines",
      "T" => "T/Indonesia",
      "U" => "U/Australia",
      "V" => "V/Hong Kong",
      "W" => "W/China",
      "X" => "X/Taiwan",
      "Y" => "Y/Singapore"
    }.freeze

    DEFAULT_ZONE = "Y"
    DEFAULT_LABEL = "Y/Singapore (default)"

    def self.call(country)
      zone = ZONE_MAP[country] || DEFAULT_ZONE
      label = if zone == DEFAULT_ZONE && !ZONE_MAP.key?(country)
                DEFAULT_LABEL
              else
                ZONE_LABELS[zone]
              end
      { rate_key: zone, label: label }
    end
  end
end

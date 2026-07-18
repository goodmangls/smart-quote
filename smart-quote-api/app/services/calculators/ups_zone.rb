module Calculators
  class UpsZone
    # Synced with frontend src/config/ups_zones.ts
    # Source: Zone Guide 2026.xlsx (UPS sheet)
    ZONE_MAP = {
      # Z1: Asia
      "CN" => "Z1", "MO" => "Z1", "SG" => "Z1", "TW" => "Z1",
      # Z2: JP-VN
      "JP" => "Z2", "VN" => "Z2",
      # Z3: SEA
      "BN" => "Z3", "ID" => "Z3", "MY" => "Z3", "PH" => "Z3", "TH" => "Z3",
      # Z4: Oceania
      "AU" => "Z4", "IN" => "Z4", "NF" => "Z4", "NZ" => "Z4",
      # Z5: Americas
      "CA" => "Z5", "MX" => "Z5", "PR" => "Z5", "US" => "Z5",
      # Z6: W.Europe
      "AD" => "Z6", "BE" => "Z6", "CH" => "Z6", "CZ" => "Z6", "DE" => "Z6",
      "ES" => "Z6", "FR" => "Z6", "GB" => "Z6", "IC" => "Z6", "IT" => "Z6",
      "LI" => "Z6", "LU" => "Z6", "MC" => "Z6", "NL" => "Z6", "PL" => "Z6",
      "SE" => "Z6", "SK" => "Z6", "SM" => "Z6", "VA" => "Z6",
      # Z7: N.Europe
      "AT" => "Z7", "AX" => "Z7", "DK" => "Z7", "FI" => "Z7",
      "GR" => "Z7", "IE" => "Z7", "NO" => "Z7", "PT" => "Z7",
      # Z8: Global (78 countries)
      "AE" => "Z8", "AG" => "Z8", "AI" => "Z8", "AR" => "Z8", "AW" => "Z8",
      "AZ" => "Z8", "BB" => "Z8", "BD" => "Z8", "BG" => "Z8", "BH" => "Z8",
      "BL" => "Z8", "BO" => "Z8", "BR" => "Z8", "BS" => "Z8", "BZ" => "Z8",
      "CL" => "Z8", "CO" => "Z8", "CR" => "Z8", "CW" => "Z8", "CY" => "Z8",
      "DM" => "Z8", "DO" => "Z8", "EC" => "Z8", "EG" => "Z8", "ER" => "Z8",
      "GD" => "Z8", "GI" => "Z8", "GP" => "Z8", "GT" => "Z8", "HN" => "Z8",
      "HR" => "Z8", "HT" => "Z8", "HU" => "Z8", "IS" => "Z8", "JM" => "Z8",
      "KH" => "Z8", "KN" => "Z8", "KW" => "Z8", "LA" => "Z8", "LC" => "Z8",
      "LK" => "Z8", "LT" => "Z8", "LV" => "Z8", "MM" => "Z8", "MQ" => "Z8",
      "MS" => "Z8", "MT" => "Z8", "MV" => "Z8", "NI" => "Z8", "OM" => "Z8",
      "PA" => "Z8", "PE" => "Z8", "PK" => "Z8", "PY" => "Z8", "QA" => "Z8",
      "RO" => "Z8", "RU" => "Z8", "SA" => "Z8", "SI" => "Z8", "SR" => "Z8",
      "SV" => "Z8", "SX" => "Z8", "TC" => "Z8", "TR" => "Z8", "TT" => "Z8",
      "UA" => "Z8", "UY" => "Z8", "VC" => "Z8", "VE" => "Z8", "VI" => "Z8",
      "ZA" => "Z8",
      # Z9: Extended (77 countries + territories)
      "AF" => "Z9", "AL" => "Z9", "AM" => "Z9", "AO" => "Z9", "AS" => "Z9",
      "BA" => "Z9", "BF" => "Z9", "BI" => "Z9", "BJ" => "Z9", "BM" => "Z9",
      "BW" => "Z9", "BY" => "Z9", "CD" => "Z9", "CF" => "Z9", "CG" => "Z9",
      "CI" => "Z9", "CM" => "Z9", "CV" => "Z9", "DJ" => "Z9", "DZ" => "Z9",
      "EE" => "Z9", "ET" => "Z9", "FO" => "Z9", "GA" => "Z9", "GE" => "Z9",
      "GH" => "Z9", "GL" => "Z9", "GM" => "Z9", "GN" => "Z9", "GQ" => "Z9",
      "GW" => "Z9", "GY" => "Z9", "IL" => "Z9", "IQ" => "Z9", "JO" => "Z9",
      "KE" => "Z9", "KG" => "Z9", "KM" => "Z9", "KZ" => "Z9", "LB" => "Z9",
      "LR" => "Z9", "LS" => "Z9", "MA" => "Z9", "MD" => "Z9", "ME" => "Z9",
      "MG" => "Z9", "MK" => "Z9", "ML" => "Z9", "MN" => "Z9", "MP" => "Z9",
      "MR" => "Z9", "MU" => "Z9", "MW" => "Z9", "MZ" => "Z9", "NA" => "Z9",
      "NC" => "Z9", "NE" => "Z9", "NG" => "Z9", "NP" => "Z9", "RE" => "Z9",
      "RS" => "Z9", "RW" => "Z9", "SC" => "Z9", "SL" => "Z9", "SN" => "Z9",
      "SZ" => "Z9", "TD" => "Z9", "TG" => "Z9", "TM" => "Z9", "TN" => "Z9",
      "TZ" => "Z9", "UG" => "Z9", "UZ" => "Z9", "WS" => "Z9", "YT" => "Z9",
      "ZM" => "Z9", "ZW" => "Z9",
      # Z9 territories (2026 update)
      "BQ" => "Z9", "VG" => "Z9", "KY" => "Z9", "GF" => "Z9",
      "GU" => "Z9", "GG" => "Z9", "JE" => "Z9",
      # Z10: HK + China Southern
      "HK" => "Z10", "CN-S" => "Z10"
    }.freeze

    ZONE_LABELS = {
      "Z1" => "Z1/Asia", "Z2" => "Z2/JP-VN", "Z3" => "Z3/SEA",
      "Z4" => "Z4/Oceania", "Z5" => "Z5/Americas", "Z6" => "Z6/W.Europe",
      "Z7" => "Z7/N.Europe", "Z8" => "Z8/Global", "Z9" => "Z9/Extended",
      "Z10" => "Z10/HK+S.China"
    }.freeze

    DEFAULT_ZONE = "Z10"
    DEFAULT_LABEL = "Rest of World"

    def self.call(country)
      zone = ZONE_MAP[country] || DEFAULT_ZONE
      label = zone == DEFAULT_ZONE && !ZONE_MAP.key?(country) ? DEFAULT_LABEL : ZONE_LABELS[zone]
      { rate_key: zone, label: label }
    end
  end
end

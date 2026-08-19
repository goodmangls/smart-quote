module Calculators
  class DhlZone
    # Synced with frontend src/config/dhl_zones.ts
    # Source: Zone Guide 2026.xlsx (DHL sheet)
    ZONE_MAP = {
      # Z1: Asia — DHL's rate sheet does not split China: Southern China (CN-S)
      # ships at the CN (Z1) rate (confirmed 2026-08-19)
      "CN" => "Z1", "CN-S" => "Z1", "HK" => "Z1", "MO" => "Z1", "SG" => "Z1", "TW" => "Z1",
      # Z2: Japan
      "JP" => "Z2",
      # Z3: SEA
      "BN" => "Z3", "ID" => "Z3", "KH" => "Z3", "LA" => "Z3", "MM" => "Z3",
      "MY" => "Z3", "PH" => "Z3", "TH" => "Z3", "VN" => "Z3",
      # Z4: Oceania
      "AU" => "Z4", "BD" => "Z4", "IN" => "Z4", "LK" => "Z4",
      "NZ" => "Z4", "PG" => "Z4", "PK" => "Z4",
      # Z5: Americas
      "CA" => "Z5", "MX" => "Z5", "US" => "Z5",
      # Z6: Europe (37 countries)
      "AD" => "Z6", "AT" => "Z6", "BE" => "Z6", "BG" => "Z6", "CH" => "Z6",
      "CY" => "Z6", "CZ" => "Z6", "DE" => "Z6", "DK" => "Z6", "EE" => "Z6",
      "ES" => "Z6", "FI" => "Z6", "FR" => "Z6", "GB" => "Z6", "GG" => "Z6",
      "GR" => "Z6", "HR" => "Z6", "HU" => "Z6", "IE" => "Z6", "IT" => "Z6",
      "JE" => "Z6", "LI" => "Z6", "LT" => "Z6", "LU" => "Z6", "LV" => "Z6",
      "MC" => "Z6", "MT" => "Z6", "NL" => "Z6", "NO" => "Z6", "PL" => "Z6",
      "PT" => "Z6", "RO" => "Z6", "SE" => "Z6", "SI" => "Z6", "SK" => "Z6",
      "SM" => "Z6", "VA" => "Z6",
      # Z7: ME-Balkans (16 countries)
      "AE" => "Z7", "AL" => "Z7", "BA" => "Z7", "BH" => "Z7", "GI" => "Z7",
      "IC" => "Z7", "IL" => "Z7", "KV" => "Z7", "KW" => "Z7", "ME" => "Z7",
      "MK" => "Z7", "OM" => "Z7", "QA" => "Z7", "RS" => "Z7", "SA" => "Z7",
      "TR" => "Z7",
      # Z8: Global (150+ countries)
      "AF" => "Z8", "AG" => "Z8", "AI" => "Z8", "AM" => "Z8", "AO" => "Z8",
      "AR" => "Z8", "AS" => "Z8", "AW" => "Z8", "AZ" => "Z8", "BB" => "Z8",
      "BF" => "Z8", "BI" => "Z8", "BJ" => "Z8", "BM" => "Z8", "BO" => "Z8",
      "BR" => "Z8", "BS" => "Z8", "BT" => "Z8", "XB" => "Z8", "BQ" => "Z8",
      "BW" => "Z8", "BY" => "Z8", "BZ" => "Z8", "CD" => "Z8", "CF" => "Z8",
      "CG" => "Z8", "CI" => "Z8", "CK" => "Z8", "CL" => "Z8", "CM" => "Z8",
      "CO" => "Z8", "CR" => "Z8", "CU" => "Z8", "CV" => "Z8", "DJ" => "Z8",
      "DM" => "Z8", "DO" => "Z8", "DZ" => "Z8", "EC" => "Z8", "EG" => "Z8",
      "ER" => "Z8", "ET" => "Z8", "FJ" => "Z8", "FK" => "Z8", "FM" => "Z8",
      "FO" => "Z8", "GA" => "Z8", "GD" => "Z8", "GE" => "Z8", "GF" => "Z8",
      "GH" => "Z8", "GL" => "Z8", "GM" => "Z8", "GN" => "Z8", "GP" => "Z8",
      "GQ" => "Z8", "GT" => "Z8", "GU" => "Z8", "GW" => "Z8", "GY" => "Z8",
      "HN" => "Z8", "HT" => "Z8", "IQ" => "Z8", "IR" => "Z8", "IS" => "Z8",
      "JM" => "Z8", "JO" => "Z8", "KE" => "Z8", "KG" => "Z8", "KI" => "Z8",
      "KM" => "Z8", "KN" => "Z8", "KP" => "Z8", "KY" => "Z8", "KZ" => "Z8",
      "LB" => "Z8", "LC" => "Z8", "LR" => "Z8", "LS" => "Z8", "LY" => "Z8",
      "MA" => "Z8", "MD" => "Z8", "MG" => "Z8", "MH" => "Z8", "ML" => "Z8",
      "MN" => "Z8", "MP" => "Z8", "MQ" => "Z8", "MR" => "Z8", "MS" => "Z8",
      "MU" => "Z8", "MV" => "Z8", "MW" => "Z8", "MZ" => "Z8", "NA" => "Z8",
      "NC" => "Z8", "NE" => "Z8", "NG" => "Z8", "NI" => "Z8", "NP" => "Z8",
      "NR" => "Z8", "NU" => "Z8", "PA" => "Z8", "PE" => "Z8", "PF" => "Z8",
      "PR" => "Z8", "PW" => "Z8", "PY" => "Z8", "RE" => "Z8", "RU" => "Z8",
      "RW" => "Z8", "SB" => "Z8", "SC" => "Z8", "SD" => "Z8", "SH" => "Z8",
      "SL" => "Z8", "SN" => "Z8", "SR" => "Z8", "SS" => "Z8", "ST" => "Z8",
      "SV" => "Z8", "SY" => "Z8", "SZ" => "Z8", "TC" => "Z8", "TD" => "Z8",
      "TG" => "Z8", "TJ" => "Z8", "TL" => "Z8", "TM" => "Z8", "TN" => "Z8",
      "TO" => "Z8", "TT" => "Z8", "TV" => "Z8", "TZ" => "Z8", "UA" => "Z8",
      "UG" => "Z8", "UY" => "Z8", "UZ" => "Z8", "VC" => "Z8", "VE" => "Z8",
      "VG" => "Z8", "VI" => "Z8", "VU" => "Z8", "WS" => "Z8", "YE" => "Z8",
      "YT" => "Z8", "ZA" => "Z8", "ZM" => "Z8", "ZW" => "Z8"
    }.freeze

    ZONE_LABELS = {
      "Z1" => "Z1/Asia", "Z2" => "Z2/Japan", "Z3" => "Z3/SEA",
      "Z4" => "Z4/Oceania", "Z5" => "Z5/Americas", "Z6" => "Z6/Europe",
      "Z7" => "Z7/ME-Balkans", "Z8" => "Z8/Global"
    }.freeze

    # CN-S gets a self-describing label so every surface that shows the applied
    # zone (result panel, comparison card, saved quote, PDF) tells the user that
    # DHL rates Southern China as CN. Mirrors src/config/dhl_zones.ts.
    CN_SOUTH_LABEL = "Z1/Asia (S.China=CN)"

    # No fallback zone: an unmapped destination raises so the API returns 422
    # (ZONE_NOT_FOUND) instead of quoting off a guessed zone.
    def self.call(country)
      zone = ZONE_MAP[country]
      raise ZoneNotFoundError.new(carrier: "DHL", country: country) unless zone

      label = country == "CN-S" ? CN_SOUTH_LABEL : ZONE_LABELS[zone]
      { rate_key: zone, label: label }
    end
  end
end

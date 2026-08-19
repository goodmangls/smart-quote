# frozen_string_literal: true

module Calculators
  class FedexZone
    # Source of truth: "FDX 국가별 ZONE.pdf" (FedEx official zone table, 수출 columns).
    # Generated — mirrors frontend src/config/fedex_zones.ts. Do not hand-edit entries.
    ZONE_MAP = {
      # A (1)
      "MO" => "A",
      # D (5)
      "BN" => "D", "GU" => "D", "KH" => "D", "LA" => "D", "MN" => "D",
      # F (4)
      "CA" => "F", "MX" => "F", "PR" => "F", "US" => "F",
      # G (18)
      "AT" => "G", "CH" => "G", "CZ" => "G", "DK" => "G", "FI" => "G", "FO" => "G", "GL" => "G",
      "GR" => "G", "HU" => "G", "IE" => "G", "LI" => "G", "LU" => "G", "MC" => "G", "NO" => "G",
      "PL" => "G", "PT" => "G", "SE" => "G", "SK" => "G",
      # H (29)
      "AD" => "H", "AL" => "H", "AM" => "H", "AZ" => "H", "BA" => "H", "BG" => "H", "BY" => "H",
      "CY" => "H", "EE" => "H", "GE" => "H", "GI" => "H", "HR" => "H", "IL" => "H", "IS" => "H",
      "KG" => "H", "KZ" => "H", "LT" => "H", "LV" => "H", "MD" => "H", "ME" => "H", "MK" => "H",
      "MT" => "H", "RO" => "H", "RS" => "H", "RU" => "H", "SI" => "H", "TR" => "H", "UA" => "H",
      "UZ" => "H",
      # I (62)
      "AG" => "I", "AI" => "I", "AN" => "I", "AR" => "I", "AS" => "I", "AW" => "I", "BB" => "I",
      "BM" => "I", "BO" => "I", "BQ" => "I", "BR" => "I", "BS" => "I", "BZ" => "I", "CK" => "I",
      "CL" => "I", "CO" => "I", "CR" => "I", "CW" => "I", "DM" => "I", "DO" => "I", "EC" => "I",
      "FJ" => "I", "FM" => "I", "GD" => "I", "GF" => "I", "GP" => "I", "GT" => "I", "GY" => "I",
      "HN" => "I", "HT" => "I", "JM" => "I", "KN" => "I", "KY" => "I", "LC" => "I", "MF" => "I",
      "MH" => "I", "MP" => "I", "MQ" => "I", "MS" => "I", "NC" => "I", "NI" => "I", "PA" => "I",
      "PE" => "I", "PF" => "I", "PG" => "I", "PW" => "I", "PY" => "I", "SR" => "I", "SV" => "I",
      "SX" => "I", "TC" => "I", "TL" => "I", "TO" => "I", "TT" => "I", "UY" => "I", "VC" => "I",
      "VE" => "I", "VG" => "I", "VI" => "I", "VU" => "I", "WF" => "I", "WS" => "I",
      # J (65)
      "AE" => "J", "AF" => "J", "AO" => "J", "BD" => "J", "BF" => "J", "BH" => "J", "BI" => "J",
      "BJ" => "J", "BT" => "J", "BW" => "J", "CD" => "J", "CG" => "J", "CI" => "J", "CM" => "J",
      "CV" => "J", "DJ" => "J", "DZ" => "J", "EG" => "J", "ER" => "J", "ET" => "J", "GA" => "J",
      "GH" => "J", "GM" => "J", "GN" => "J", "IQ" => "J", "JO" => "J", "KE" => "J", "KW" => "J",
      "LB" => "J", "LK" => "J", "LR" => "J", "LS" => "J", "LY" => "J", "MA" => "J", "MG" => "J",
      "ML" => "J", "MR" => "J", "MU" => "J", "MV" => "J", "MW" => "J", "MZ" => "J", "NA" => "J",
      "NE" => "J", "NG" => "J", "NP" => "J", "OM" => "J", "PK" => "J", "PS" => "J", "QA" => "J",
      "RE" => "J", "RW" => "J", "SA" => "J", "SC" => "J", "SN" => "J", "SY" => "J", "SZ" => "J",
      "TD" => "J", "TG" => "J", "TN" => "J", "TZ" => "J", "UG" => "J", "YE" => "J", "ZA" => "J",
      "ZM" => "J", "ZW" => "J",
      # K (1)
      "CN-S" => "K",
      # M (7)
      "BE" => "M", "DE" => "M", "ES" => "M", "FR" => "M", "GB" => "M", "IT" => "M", "NL" => "M",
      # N (1)
      "VN" => "N",
      # O (1)
      "IN" => "O",
      # P (1)
      "JP" => "P",
      # Q (1)
      "MY" => "Q",
      # R (1)
      "TH" => "R",
      # S (1)
      "PH" => "S",
      # T (1)
      "ID" => "T",
      # U (2)
      "AU" => "U", "NZ" => "U",
      # V (1)
      "HK" => "V",
      # W (1)
      "CN" => "W",
      # X (1)
      "TW" => "X",
      # Y (1)
      "SG" => "Y"
    }.freeze

    ZONE_LABELS = {
      "A" => "A/Macao",
      "D" => "D/Guam-SEA",
      "E" => "E/US West",
      "F" => "F/US-CA-MX",
      "G" => "G/Europe-2",
      "H" => "H/E.Europe-C.Asia",
      "I" => "I/LatAm-Caribbean",
      "J" => "J/Africa-M.East",
      "K" => "K/S.China",
      "M" => "M/W.Europe",
      "N" => "N/Vietnam",
      "O" => "O/India",
      "P" => "P/Japan",
      "Q" => "Q/Malaysia",
      "R" => "R/Thailand",
      "S" => "S/Philippines",
      "T" => "T/Indonesia",
      "U" => "U/Australia-NZ",
      "V" => "V/Hong Kong",
      "W" => "W/China",
      "X" => "X/Taiwan",
      "Y" => "Y/Singapore"
    }.freeze

    # No fallback zone: an unmapped destination raises so the API returns 422
    # (ZONE_NOT_FOUND) instead of quoting off a guessed zone. (History: the
    # fallback was Y/Singapore, then J — both quoted unmapped destinations
    # without telling the caller.)
    def self.call(country)
      zone = ZONE_MAP[country]
      raise ZoneNotFoundError.new(carrier: "FEDEX", country: country) unless zone

      { rate_key: zone, label: ZONE_LABELS[zone] }
    end
  end
end

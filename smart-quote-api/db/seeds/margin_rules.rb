return if MarginRule.exists?

MarginRule.create!([
  # Priority 0 (code P100): Goodman GLS admin per-user weight-based
  { name: "굿맨GLS 신현억 ≥20kg", rule_type: "weight_based", priority: 100,
    match_email: "ceo@goodmangls.com", weight_min: 20, margin_percent: 19 },
  { name: "굿맨GLS 신현억 <20kg", rule_type: "weight_based", priority: 100,
    match_email: "ceo@goodmangls.com", weight_min: 0, weight_max: 19.99, margin_percent: 24 },
  { name: "굿맨GLS 전경환 ≥20kg", rule_type: "weight_based", priority: 100,
    match_email: "ken.jeon@goodmangls.com", weight_min: 20, margin_percent: 19 },
  { name: "굿맨GLS 전경환 <20kg", rule_type: "weight_based", priority: 100,
    match_email: "ken.jeon@goodmangls.com", weight_min: 0, weight_max: 19.99, margin_percent: 24 },
  { name: "굿맨GLS 임재홍 ≥20kg", rule_type: "weight_based", priority: 100,
    match_email: "jaehong.lim@goodmangls.com", weight_min: 20, margin_percent: 19 },
  { name: "굿맨GLS 임재홍 <20kg", rule_type: "weight_based", priority: 100,
    match_email: "jaehong.lim@goodmangls.com", weight_min: 0, weight_max: 19.99, margin_percent: 24 },
  { name: "굿맨GLS 이창희 ≥20kg", rule_type: "weight_based", priority: 100,
    match_email: "charlie@goodmangls.com", weight_min: 20, margin_percent: 19 },
  { name: "굿맨GLS 이창희 <20kg", rule_type: "weight_based", priority: 100,
    match_email: "charlie@goodmangls.com", weight_min: 0, weight_max: 19.99, margin_percent: 24 },

  # Priority 1 (code P100): 용성종합물류 flat override
  { name: "용성종합물류 고정", rule_type: "flat", priority: 100,
    match_email: "admin@yslogic.co.kr", margin_percent: 19 },

  # Priority 2 (code P100): 인터블루에어엔씨 — 원가 공개 (margin 0%)
  { name: "인터블루 고정", rule_type: "flat", priority: 100,
    match_email: "ibas@inter-airsea.co.kr", margin_percent: 0 },

  # Priority 3 (code P50): 한국 국적 일반
  { name: "한국 국적 ≥20kg", rule_type: "weight_based", priority: 50,
    match_nationality: "KR", weight_min: 20, margin_percent: 19 },
  { name: "한국 국적 <20kg", rule_type: "weight_based", priority: 50,
    match_nationality: "KR", weight_min: 0, weight_max: 19.99, margin_percent: 24 },

  # Priority 4 (code P0): 비한국/해외 기본
  { name: "기본 ≥20kg", rule_type: "weight_based", priority: 0,
    weight_min: 20, margin_percent: 24 },
  { name: "기본 <20kg", rule_type: "weight_based", priority: 0,
    weight_min: 0, weight_max: 19.99, margin_percent: 32 }
])

Rails.logger.info "[SEED] Created #{MarginRule.count} margin rules"

FactoryBot.define do
  factory :partner_api_key do
    sequence(:name) { |n| "Partner #{n}" }
    margin_identity { "bridgelogis@partner.quote-api" }
    nationality { nil }
    is_active { true }
    revoked_at { nil }

    # Expose the plaintext key the factory generated so specs can send it.
    transient do
      plaintext { nil }
    end

    after(:build) do |key, evaluator|
      raw = evaluator.plaintext || PartnerApiKey.generate_raw_key
      key.assign_raw_key(raw)
      key.instance_variable_set(:@raw_key, raw)
    end

    trait :revoked do
      is_active { false }
      revoked_at { Time.current }
    end

    trait :inactive do
      is_active { false }
    end
  end
end

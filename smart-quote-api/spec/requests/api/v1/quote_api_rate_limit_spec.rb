require "rails_helper"

# Rack::Attack is middleware, so these specs drive it through the full stack.
# It is disabled by default in the test env (see rails_helper) and enabled only
# here, so the rest of the suite is not throttled by its own request volume.
RSpec.describe "Partner quote API rate limiting", type: :request do
  let!(:partner_key) { create(:partner_api_key) }
  let(:raw_key) { partner_key.instance_variable_get(:@raw_key) }
  let(:headers) { { "X-API-Key" => raw_key } }

  let(:payload) do
    {
      carrier: "UPS",
      origin: { country: "KR" },
      destination: { country: "BE", airport: "BRU" },
      cargo: { packages: [ { quantity: 1, length_cm: 55, width_cm: 55, height_cm: 33, gross_weight_kg: 77 } ] },
      terms: { incoterms: "DAP" }
    }
  end

  before do
    allow(QuoteCalculator).to receive(:call).and_return(
      totalQuoteAmount: 1_500_000, totalQuoteAmountUSD: 1_150.50,
      totalCostAmount: 1_200_000, profitAmount: 300_000, profitMargin: 20.0,
      billableWeight: 15.5, appliedZone: "Z5", domesticTruckType: "1t Truck",
      breakdown: { totalCost: 1_060_000 }, warnings: []
    )

    Rack::Attack.enabled = true
    Rack::Attack.reset!
  end

  after do
    Rack::Attack.enabled = false
    Rack::Attack.reset!
  end

  # Rack::Attack counts into fixed windows keyed by Time.now.to_i / period, so a
  # real clock tick partway through these loops would reset the counter and make
  # the assertion flaky. Freeze the clock to keep every request in one window.
  it "returns 429 once the per-minute limit is exceeded" do
    freeze_time do
      30.times do
        post "/api/v1/quote_api/quotes", params: payload, headers: headers, as: :json
      end
      expect(response).to have_http_status(:created)

      post "/api/v1/quote_api/quotes", params: payload, headers: headers, as: :json

      expect(response).to have_http_status(:too_many_requests)
      expect(JSON.parse(response.body).dig("error", "code")).to eq("RATE_LIMITED")
    end
  end

  it "throttles per API key, so one partner cannot exhaust another's quota" do
    other_key = create(:partner_api_key)
    other_raw = other_key.instance_variable_get(:@raw_key)

    freeze_time do
      31.times do
        post "/api/v1/quote_api/quotes", params: payload, headers: headers, as: :json
      end
      expect(response).to have_http_status(:too_many_requests)

      post "/api/v1/quote_api/quotes", params: payload,
           headers: { "X-API-Key" => other_raw }, as: :json

      expect(response).to have_http_status(:created)
    end
  end

  it "does not write the raw API key into the throttle cache key" do
    post "/api/v1/quote_api/quotes", params: payload, headers: headers, as: :json

    keys = Rack::Attack.cache.store.instance_variable_get(:@data)&.keys || []
    expect(keys.join(" ")).not_to include(raw_key)
  end
end

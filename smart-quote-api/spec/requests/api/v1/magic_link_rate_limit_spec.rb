require "rails_helper"

# Rack::Attack is middleware, so these specs drive it through the full stack.
# It is disabled by default in the test env (see rails_helper) and enabled only
# here, so the rest of the suite is not throttled by its own request volume.
#
# A magic link token is credential-equivalent: whoever presents a valid one is
# handed a session. The 20/minute throttle exists for exactly that, but it was
# written as `req.get?` — and the frontend moved to POST on 2026-08-17, which
# left the live verification path covered only by the general 300/minute API
# limit, a 15x weaker bound on token guessing.
RSpec.describe "Magic link verification rate limiting", type: :request do
  let(:user) { create(:user, email: "throttle@example.com") }

  before do
    Rack::Attack.enabled = true
    Rack::Attack.reset!
  end

  after do
    Rack::Attack.enabled = false
    Rack::Attack.reset!
  end

  # Rack::Attack counts into fixed windows keyed by Time.now.to_i / period, so a
  # real clock tick partway through the loop would reset the counter and make
  # the assertion flaky. Freeze the clock to keep every request in one window.
  it "returns 429 once the per-minute limit is exceeded" do
    freeze_time do
      20.times do
        post "/api/v1/auth/magic_link/verify", params: { token: "bogus" }, as: :json
      end
      expect(response).to have_http_status(:unauthorized)

      post "/api/v1/auth/magic_link/verify", params: { token: "bogus" }, as: :json

      expect(response).to have_http_status(:too_many_requests)
      expect(JSON.parse(response.body).dig("error", "code")).to eq("RATE_LIMITED")
    end
  end

  it "lets a legitimate verification through under the limit" do
    raw = user.generate_magic_link_token!

    freeze_time do
      3.times do
        post "/api/v1/auth/magic_link/verify", params: { token: "bogus" }, as: :json
        expect(response).to have_http_status(:unauthorized)
      end

      post "/api/v1/auth/magic_link/verify", params: { token: raw }, as: :json
      expect(response).to have_http_status(:ok)
    end
  end
end

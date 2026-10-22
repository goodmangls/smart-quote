require "rails_helper"

# Revocation must survive a process restart.
#
# Production's cache is :memory_store, so anything kept only there is gone after
# every redeploy and every free-plan spin-down. `Rails.cache.clear` stands in for
# that restart: a token revoked before it must stay revoked after it.
#
# Each test replays the OLD token explicitly. Relying on the cookie jar would
# pass vacuously — logout clears the cookie, so the follow-up request carries
# no token at all.
RSpec.describe "JWT revocation persistence", type: :request do
  let!(:user) { create(:user, email: "revoke@example.com", password: "password123") }

  def login
    post "/api/v1/auth/login", params: { email: user.email, password: "password123" }, as: :json
    { access: JSON.parse(response.body)["token"], refresh: response.cookies["refresh_token"] }
  end

  def refresh_with(token)
    post "/api/v1/auth/refresh", headers: { "Cookie" => "refresh_token=#{token}" }, as: :json
  end

  it "keeps a rotated refresh token rejected after a restart" do
    old_refresh = login[:refresh]
    refresh_with(old_refresh)
    expect(response).to have_http_status(:ok)

    Rails.cache.clear
    refresh_with(old_refresh)

    expect(response).to have_http_status(:unauthorized)
  end

  it "keeps a logged-out refresh token rejected after a restart" do
    tokens = login
    post "/api/v1/auth/logout",
         headers: { "Authorization" => "Bearer #{tokens[:access]}", "Cookie" => "refresh_token=#{tokens[:refresh]}" }

    Rails.cache.clear
    refresh_with(tokens[:refresh])

    expect(response).to have_http_status(:unauthorized)
  end

  it "keeps a logged-out access token rejected after a restart" do
    tokens = login
    post "/api/v1/auth/logout", headers: { "Authorization" => "Bearer #{tokens[:access]}" }

    Rails.cache.clear
    get "/api/v1/auth/me", headers: { "Authorization" => "Bearer #{tokens[:access]}" }

    expect(response).to have_http_status(:unauthorized)
  end

  it "still accepts a token nobody revoked" do
    tokens = login

    Rails.cache.clear
    get "/api/v1/auth/me", headers: { "Authorization" => "Bearer #{tokens[:access]}" }

    expect(response).to have_http_status(:ok)
  end
end

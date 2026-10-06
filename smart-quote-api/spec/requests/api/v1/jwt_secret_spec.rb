require "rails_helper"

# config/master.key was committed to a public repository, so anything stored in
# config/credentials.yml.enc must be treated as known to attackers. The JWT
# signing secret therefore must never come from credentials.
RSpec.describe "JWT signing secret", type: :request do
  let(:user) { create(:user) }
  let(:leaked_secret) { "credentials-secret-anyone-can-decrypt" }

  def token_signed_with(secret)
    JWT.encode({ user_id: user.id, role: user.role, exp: 1.hour.from_now.to_i }, secret, "HS256")
  end

  it "rejects a token signed with the credentials secret_key_base" do
    allow(Rails.application.credentials).to receive(:secret_key_base).and_return(leaked_secret)

    get "/api/v1/auth/me", headers: auth_headers(token_signed_with(leaked_secret))

    expect(response).to have_http_status(:unauthorized)
  end

  it "accepts a token signed with the application signing secret" do
    allow(Rails.application.credentials).to receive(:secret_key_base).and_return(leaked_secret)

    get "/api/v1/auth/me", headers: auth_headers(token_signed_with(JwtAuthenticatable.signing_secret))

    expect(response).to have_http_status(:ok)
  end

  describe ".signing_secret in production" do
    before { allow(Rails.env).to receive(:production?).and_return(true) }

    it "uses SECRET_KEY_BASE from the environment" do
      stub_const("ENV", ENV.to_h.merge("SECRET_KEY_BASE" => "env-secret"))
      expect(JwtAuthenticatable.signing_secret).to eq("env-secret")
    end

    it "fails closed instead of falling back to credentials when SECRET_KEY_BASE is missing" do
      stub_const("ENV", ENV.to_h.except("SECRET_KEY_BASE"))
      allow(Rails.application.credentials).to receive(:secret_key_base).and_return(leaked_secret)

      expect { JwtAuthenticatable.signing_secret }.to raise_error(KeyError, /SECRET_KEY_BASE/)
    end
  end
end

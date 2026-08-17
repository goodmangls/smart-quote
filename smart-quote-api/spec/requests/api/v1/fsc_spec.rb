# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::V1::Fsc", type: :request do
  let(:admin) { create(:user, :admin) }
  let(:user) { create(:user) }
  let(:admin_headers) { auth_headers(jwt_token_for(admin)) }
  let(:user_headers) { auth_headers(jwt_token_for(user)) }
  let(:json) { JSON.parse(response.body) }

  describe "GET /api/v1/fsc/rates" do
    it "returns 401 without authentication" do
      get "/api/v1/fsc/rates"
      expect(response).to have_http_status(:unauthorized)
    end

    it "returns the current rates for an authenticated user" do
      get "/api/v1/fsc/rates", headers: user_headers

      expect(response).to have_http_status(:ok)
      expect(json).to have_key("rates")
      expect(json).to have_key("updatedAt")
    end
  end

  describe "POST /api/v1/fsc/update" do
    let(:valid_params) { { carrier: "UPS", international: 45.5, domestic: 0 } }

    it "rejects non-admin users" do
      post "/api/v1/fsc/update", params: valid_params, headers: user_headers, as: :json
      expect(response).to have_http_status(:forbidden)
    end

    it "rejects an unknown carrier" do
      post "/api/v1/fsc/update", params: valid_params.merge(carrier: "TNT"), headers: admin_headers, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(json.dig("error", "code")).to eq("INVALID_CARRIER")
    end

    it "rejects non-numeric and out-of-range rates" do
      post "/api/v1/fsc/update", params: valid_params.merge(international: "abc"), headers: admin_headers, as: :json
      expect(json.dig("error", "code")).to eq("INVALID_RATE")

      post "/api/v1/fsc/update", params: valid_params.merge(international: 150), headers: admin_headers, as: :json
      expect(json.dig("error", "code")).to eq("INVALID_RATE")
    end

    it "updates the rate and records an audit log" do
      expect {
        post "/api/v1/fsc/update", params: valid_params, headers: admin_headers, as: :json
      }.to change { AuditLog.where(action: "fsc.updated").count }.by(1)

      expect(response).to have_http_status(:ok)
      expect(json["success"]).to be(true)
      expect(FscRate.find_by(carrier: "UPS").international).to eq(45.5)
    end
  end
end

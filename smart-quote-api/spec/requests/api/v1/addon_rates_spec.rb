# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::V1::AddonRates", type: :request do
  let(:admin) { create(:user, :admin) }
  let(:user) { create(:user) }
  let(:admin_headers) { auth_headers(jwt_token_for(admin)) }
  let(:user_headers) { auth_headers(jwt_token_for(user)) }
  let(:json) { JSON.parse(response.body) }

  let(:valid_params) do
    {
      code: "TESTFEE",
      carrier: "FEDEX",
      name_en: "Test Fee",
      name_ko: "테스트 요금",
      charge_type: "fixed",
      unit: "shipment",
      amount: 35_600,
      effective_from: Date.current.iso8601
    }
  end

  describe "authorization" do
    it "returns 401 without authentication" do
      get "/api/v1/addon_rates"
      expect(response).to have_http_status(:unauthorized)
    end

    it "hides admin CRUD from members but allows resolve" do
      post "/api/v1/addon_rates", params: valid_params, headers: user_headers, as: :json
      expect(response).to have_http_status(:forbidden)

      get "/api/v1/addon_rates/resolve", params: { carrier: "FEDEX" }, headers: user_headers
      expect(response).to have_http_status(:ok)
      expect(json).to have_key("addonRates")
    end
  end

  describe "POST /api/v1/addon_rates" do
    it "creates a rate and records an audit log" do
      expect {
        post "/api/v1/addon_rates", params: valid_params, headers: admin_headers, as: :json
      }.to change { AuditLog.where(action: "addon_rate.created").count }.by(1)

      expect(response).to have_http_status(:created)
      expect(AddonRate.find_by(code: "TESTFEE", carrier: "FEDEX")).to be_present
    end

    it "rejects a duplicate code within the same carrier" do
      AddonRate.create!(valid_params.merge(created_by: admin.email))

      post "/api/v1/addon_rates", params: valid_params, headers: admin_headers, as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(json.dig("error", "code")).to eq("VALIDATION_ERROR")
    end

    it "allows the same code on a different carrier" do
      AddonRate.create!(valid_params.merge(created_by: admin.email))

      post "/api/v1/addon_rates", params: valid_params.merge(carrier: "UPS"), headers: admin_headers, as: :json

      expect(response).to have_http_status(:created)
    end
  end

  describe "DELETE /api/v1/addon_rates/:id" do
    it "soft-deletes and drops the rate from the active index" do
      rate = AddonRate.create!(valid_params.merge(created_by: admin.email))

      delete "/api/v1/addon_rates/#{rate.id}", headers: admin_headers

      expect(response).to have_http_status(:ok)
      expect(rate.reload.is_active).to be(false)

      get "/api/v1/addon_rates", params: { carrier: "FEDEX" }, headers: admin_headers
      expect(json["addonRates"].map { |r| r["code"] }).not_to include("TESTFEE")
    end
  end

  describe "GET /api/v1/addon_rates/resolve" do
    it "rejects an unknown carrier" do
      get "/api/v1/addon_rates/resolve", params: { carrier: "TNT" }, headers: user_headers

      expect(response).to have_http_status(:unprocessable_content)
      expect(json.dig("error", "code")).to eq("INVALID_CARRIER")
    end
  end
end

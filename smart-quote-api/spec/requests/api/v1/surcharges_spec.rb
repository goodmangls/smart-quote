# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::V1::Surcharges", type: :request do
  let(:admin) { create(:user, :admin) }
  let(:user) { create(:user) }
  let(:admin_headers) { auth_headers(jwt_token_for(admin)) }
  let(:user_headers) { auth_headers(jwt_token_for(user)) }
  let(:json) { JSON.parse(response.body) }

  let(:valid_params) do
    {
      code: "TEST_SGF",
      name: "Test Surge Fee",
      carrier: "UPS",
      charge_type: "fixed",
      amount: 4722,
      effective_from: Date.current.iso8601
    }
  end

  describe "authorization" do
    it "returns 401 without authentication" do
      get "/api/v1/surcharges"
      expect(response).to have_http_status(:unauthorized)
    end

    it "hides admin CRUD from members" do
      get "/api/v1/surcharges", headers: user_headers
      expect(response).to have_http_status(:forbidden)

      post "/api/v1/surcharges", params: valid_params, headers: user_headers, as: :json
      expect(response).to have_http_status(:forbidden)
    end

    it "allows members to resolve" do
      get "/api/v1/surcharges/resolve", params: { carrier: "UPS", country: "IL" }, headers: user_headers
      expect(response).to have_http_status(:ok)
      expect(json).to have_key("surcharges")
    end
  end

  describe "POST /api/v1/surcharges" do
    it "creates a surcharge, stamps the creator, and records an audit log" do
      expect {
        post "/api/v1/surcharges", params: valid_params, headers: admin_headers, as: :json
      }.to change { AuditLog.where(action: "surcharge.created").count }.by(1)

      expect(response).to have_http_status(:created)
      expect(json["code"]).to eq("TEST_SGF")
      expect(Surcharge.find_by(code: "TEST_SGF").created_by).to eq(admin.email)
    end

    it "returns validation errors for an incomplete payload" do
      post "/api/v1/surcharges", params: valid_params.except(:name), headers: admin_headers, as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(json.dig("error", "code")).to eq("VALIDATION_ERROR")
    end
  end

  describe "PUT /api/v1/surcharges/:id and DELETE" do
    let!(:surcharge) do
      Surcharge.create!(valid_params.merge(created_by: admin.email))
    end

    it "updates and audits" do
      expect {
        put "/api/v1/surcharges/#{surcharge.id}", params: { amount: 5000 }, headers: admin_headers, as: :json
      }.to change { AuditLog.where(action: "surcharge.updated").count }.by(1)

      expect(response).to have_http_status(:ok)
      expect(surcharge.reload.amount).to eq(5000)
    end

    it "soft-deletes (deactivates) instead of destroying" do
      expect {
        delete "/api/v1/surcharges/#{surcharge.id}", headers: admin_headers
      }.to change { AuditLog.where(action: "surcharge.deleted").count }.by(1)

      expect(response).to have_http_status(:ok)
      expect(surcharge.reload.is_active).to be(false)
      expect(Surcharge.exists?(surcharge.id)).to be(true)
    end

    it "excludes deactivated surcharges from the index" do
      surcharge.update!(is_active: false)

      get "/api/v1/surcharges", headers: admin_headers

      expect(json["surcharges"].map { |s| s["code"] }).not_to include("TEST_SGF")
    end
  end
end

require "rails_helper"

RSpec.describe "Api::V1::Quotes", type: :request do
  let(:admin) { create(:user, :admin) }
  let(:user) { create(:user) }
  let(:admin_token) { jwt_token_for(admin) }
  let(:user_token) { jwt_token_for(user) }
  let(:admin_headers) { auth_headers(admin_token) }
  let(:user_headers) { auth_headers(user_token) }

  let(:calculator_result) do
    {
      totalQuoteAmount: 1_500_000,
      totalQuoteAmountUSD: 1_150.50,
      totalCostAmount: 1_200_000,
      profitAmount: 300_000,
      profitMargin: 20.0,
      billableWeight: 15.5,
      appliedZone: "Z5",
      domesticTruckType: "1t Truck",
      breakdown: {
        domesticBase: 50_000,
        domesticSurcharge: 0,
        packingMaterial: 30_000,
        packingLabor: 20_000,
        packingFumigation: 10_000,
        handlingFees: 15_000,
        upsBase: 800_000,
        upsFsc: 120_000,
        upsWarRisk: 5_000,
        upsSurge: 10_000,
        destDuty: 0,
        totalCost: 1_060_000
      },
      warnings: []
    }
  end

  let(:valid_params) do
    {
      destinationCountry: "US",
      destinationZip: "10001",
      domesticRegionCode: "A",
      incoterm: "FOB",
      packingType: "NONE",
      marginPercent: 15.0,
      exchangeRate: 1300.0,
      fscPercent: 27.5,
      items: [
        {
          name: "Electronic Parts",
          quantity: 2,
          weight: 5.0,
          length: 40,
          width: 30,
          height: 20
        }
      ]
    }
  end

  before do
    allow(QuoteCalculator).to receive(:call).and_return(calculator_result)
  end

  def json
    JSON.parse(response.body)
  end

  describe "POST /api/v1/quotes/calculate" do
    it "works without authentication (public endpoint)" do
      post "/api/v1/quotes/calculate", params: valid_params, as: :json

      expect(response).to have_http_status(:ok)
    end

    context "input validation" do
      it "returns 422 when destinationCountry is missing" do
        params = valid_params.except(:destinationCountry)
        post "/api/v1/quotes/calculate", params: params, as: :json

        expect(response).to have_http_status(:unprocessable_entity)
        expect(json["error"]["code"]).to eq("INVALID_INPUT")
        expect(json["error"]["message"]).to match(/destinationCountry/)
      end

      it "returns 422 when an item has weight of 0" do
        params = valid_params.merge(items: [ { weight: 0, quantity: 1 } ])
        post "/api/v1/quotes/calculate", params: params, as: :json

        expect(response).to have_http_status(:unprocessable_entity)
        expect(json["error"]["code"]).to eq("INVALID_INPUT")
        expect(json["error"]["message"]).to match(/weight must be greater than 0/)
      end

      it "returns 422 when an item has negative weight" do
        params = valid_params.merge(items: [ { weight: -1, quantity: 1 } ])
        post "/api/v1/quotes/calculate", params: params, as: :json

        expect(response).to have_http_status(:unprocessable_entity)
        expect(json["error"]["code"]).to eq("INVALID_INPUT")
      end
    end
  end

  describe "POST /api/v1/quotes" do
    it "returns 401 without authentication" do
      post "/api/v1/quotes", params: valid_params, as: :json

      expect(response).to have_http_status(:unauthorized)
    end

    it "creates a quote for authenticated user" do
      post "/api/v1/quotes", params: valid_params, headers: user_headers, as: :json

      expect(response).to have_http_status(:created)
      expect(json["referenceNo"]).to match(/\ASQ-\d{4}-\d{4}\z/)
      expect(json["destinationCountry"]).to eq("US")
      expect(json["totalQuoteAmount"]).to eq(1_500_000)
      expect(Quote.last.user_id).to eq(user.id)
    end

    it "creates an audit log on quote creation" do
      expect {
        post "/api/v1/quotes", params: valid_params, headers: user_headers, as: :json
      }.to change(AuditLog, :count).by(1)

      log = AuditLog.last
      expect(log.action).to eq("quote.created")
      expect(log.resource_type).to eq("Quote")
      expect(log.user_id).to eq(user.id)
    end

    it "calls QuoteCalculator with input params" do
      post "/api/v1/quotes", params: valid_params, headers: admin_headers, as: :json

      expect(QuoteCalculator).to have_received(:call)
    end

    context "when validation fails" do
      it "returns 422 with error details" do
        invalid_result = calculator_result.merge(totalQuoteAmount: nil, totalCostAmount: nil)
        allow(QuoteCalculator).to receive(:call).and_return(invalid_result)

        post "/api/v1/quotes", params: valid_params.merge(incoterm: "INVALID"), headers: admin_headers, as: :json

        expect(response).to have_http_status(:unprocessable_entity)
        expect(json["error"]["code"]).to eq("VALIDATION_ERROR")
      end
    end

    context "input validation" do
      it "returns 422 when destinationCountry is missing" do
        params = valid_params.except(:destinationCountry)
        post "/api/v1/quotes", params: params, headers: user_headers, as: :json

        expect(response).to have_http_status(:unprocessable_entity)
        expect(json["error"]["code"]).to eq("INVALID_INPUT")
        expect(json["error"]["message"]).to match(/destinationCountry/)
      end

      it "returns 422 when an item has weight of 0" do
        params = valid_params.merge(items: [ { weight: 0, quantity: 1 } ])
        post "/api/v1/quotes", params: params, headers: user_headers, as: :json

        expect(response).to have_http_status(:unprocessable_entity)
        expect(json["error"]["code"]).to eq("INVALID_INPUT")
        expect(json["error"]["message"]).to match(/weight must be greater than 0/)
      end

      it "does not call QuoteCalculator when input is invalid" do
        params = valid_params.except(:destinationCountry)
        post "/api/v1/quotes", params: params, headers: user_headers, as: :json

        expect(QuoteCalculator).not_to have_received(:call)
      end
    end
  end

  describe "GET /api/v1/quotes" do
    it "returns 401 without authentication" do
      get "/api/v1/quotes"

      expect(response).to have_http_status(:unauthorized)
    end

    context "as admin" do
      before do
        create_list(:quote, 3, user: admin)
        create(:quote, user: user)
      end

      it "returns all quotes" do
        get "/api/v1/quotes", headers: admin_headers

        expect(response).to have_http_status(:ok)
        expect(json["quotes"].length).to eq(4)
        expect(json["pagination"]["totalCount"]).to eq(4)
      end

      it "supports per_page parameter" do
        get "/api/v1/quotes", params: { per_page: 2 }, headers: admin_headers

        expect(json["quotes"].length).to eq(2)
        expect(json["pagination"]["totalPages"]).to eq(2)
      end
    end

    context "as regular user" do
      before do
        create_list(:quote, 2, user: user)
        create(:quote, user: admin)
      end

      it "returns only own quotes" do
        get "/api/v1/quotes", headers: user_headers

        expect(response).to have_http_status(:ok)
        expect(json["quotes"].length).to eq(2)
      end
    end

    context "with filters" do
      it "filters by destination_country" do
        create(:quote, destination_country: "JP", user: admin)

        get "/api/v1/quotes", params: { destination_country: "JP" }, headers: admin_headers

        expect(json["quotes"].length).to eq(1)
        expect(json["quotes"].first["destinationCountry"]).to eq("JP")
      end

      it "filters by status" do
        create(:quote, :sent, user: admin)

        get "/api/v1/quotes", params: { status: "sent" }, headers: admin_headers

        json["quotes"].each do |q|
          expect(q["status"]).to eq("sent")
        end
      end

      it "searches by text query" do
        target = create(:quote, destination_country: "JP", user: admin)

        get "/api/v1/quotes", params: { q: "JP" }, headers: admin_headers

        refs = json["quotes"].map { |q| q["referenceNo"] }
        expect(refs).to include(target.reference_no)
      end
    end
  end

  describe "GET /api/v1/quotes/:id" do
    it "returns the quote detail for owner" do
      quote = create(:quote, user: user)

      get "/api/v1/quotes/#{quote.id}", headers: user_headers

      expect(response).to have_http_status(:ok)
      expect(json["id"]).to eq(quote.id)
      expect(json["referenceNo"]).to eq(quote.reference_no)
    end

    it "returns 404 for other user's quote" do
      quote = create(:quote, user: admin)

      get "/api/v1/quotes/#{quote.id}", headers: user_headers

      expect(response).to have_http_status(:not_found)
    end

    it "admin can see any quote" do
      quote = create(:quote, user: user)

      get "/api/v1/quotes/#{quote.id}", headers: admin_headers

      expect(response).to have_http_status(:ok)
    end

    it "returns 404 when quote not found" do
      get "/api/v1/quotes/0", headers: admin_headers

      expect(response).to have_http_status(:not_found)
      expect(json["error"]["code"]).to eq("NOT_FOUND")
    end
  end

  describe "DELETE /api/v1/quotes/:id" do
    it "deletes own quote" do
      quote = create(:quote, user: user)

      expect {
        delete "/api/v1/quotes/#{quote.id}", headers: user_headers
      }.to change(Quote, :count).by(-1)

      expect(response).to have_http_status(:no_content)
    end

    it "creates an audit log on quote deletion" do
      quote = create(:quote, user: user)

      expect {
        delete "/api/v1/quotes/#{quote.id}", headers: user_headers
      }.to change(AuditLog, :count).by(1)

      log = AuditLog.last
      expect(log.action).to eq("quote.deleted")
      expect(log.user_id).to eq(user.id)
    end

    it "returns 404 for other user's quote" do
      quote = create(:quote, user: admin)

      delete "/api/v1/quotes/#{quote.id}", headers: user_headers

      expect(response).to have_http_status(:not_found)
    end

    it "admin can delete any quote" do
      quote = create(:quote, user: user)

      expect {
        delete "/api/v1/quotes/#{quote.id}", headers: admin_headers
      }.to change(Quote, :count).by(-1)
    end
  end

  describe "GET /api/v1/quotes/export" do
    before do
      create_list(:quote, 3, user: admin)
    end

    it "returns CSV data" do
      get "/api/v1/quotes/export", headers: admin_headers

      expect(response).to have_http_status(:ok)
      expect(response.content_type).to include("text/csv")

      csv_lines = response.body.split("\n")
      expect(csv_lines.first).to include("Reference No")
      expect(csv_lines.length).to eq(4)
    end

    it "creates an audit log on export" do
      expect {
        get "/api/v1/quotes/export", headers: admin_headers
      }.to change(AuditLog, :count).by(1)

      log = AuditLog.last
      expect(log.action).to eq("quote.exported")
      expect(log.user_id).to eq(admin.id)
    end

    it "regular user only exports own quotes" do
      create(:quote, user: user)

      get "/api/v1/quotes/export", headers: user_headers

      csv_lines = response.body.split("\n")
      expect(csv_lines.length).to eq(2) # header + 1 own quote
    end

    it "returns xlsx when format=xlsx" do
      get "/api/v1/quotes/export.xlsx", headers: admin_headers

      expect(response).to have_http_status(:ok)
      expect(response.content_type).to start_with("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
      expect(response.body[0, 2]).to eq("PK") # zip magic bytes
    end

    it "filters export by amount range (KRW)" do
      hi = create(:quote, user: admin, total_quote_amount: 10_000_000, total_quote_amount_usd: 7_000.00)
      create(:quote, user: admin, total_quote_amount: 50_000, total_quote_amount_usd: 35.00)

      get "/api/v1/quotes/export",
        params: { min_amount: 5_000_000, amount_currency: "KRW" },
        headers: admin_headers

      expect(response).to have_http_status(:ok)
      expect(response.body).to include(hi.reference_no)
      expect(response.body.lines.size).to eq(2) # header + 1 row
    end

    it "returns 422 when min_amount > max_amount" do
      get "/api/v1/quotes/export",
        params: { min_amount: 1_000_000, max_amount: 100, amount_currency: "KRW" },
        headers: admin_headers

      expect(response).to have_http_status(:unprocessable_entity)
      expect(JSON.parse(response.body).dig("error", "code")).to eq("INVALID_AMOUNT_RANGE")
    end
  end
end

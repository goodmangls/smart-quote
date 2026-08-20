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

      # An exchangeRate of 0 used to divide straight through to Infinity, which
      # ActiveSupport serialises as null — so the caller got a quote whose USD
      # total was silently missing. There is no reading of "0" that produces a
      # usable rate, so it is rejected rather than defaulted.
      it "returns 422 when exchangeRate is 0" do
        params = valid_params.merge(exchangeRate: 0)
        post "/api/v1/quotes/calculate", params: params, as: :json

        expect(response).to have_http_status(:unprocessable_entity)
        expect(json["error"]["code"]).to eq("INVALID_INPUT")
        expect(json["error"]["message"]).to match(/exchangeRate/)
      end

      it "returns 422 when exchangeRate is negative" do
        params = valid_params.merge(exchangeRate: -1400)
        post "/api/v1/quotes/calculate", params: params, as: :json

        expect(response).to have_http_status(:unprocessable_entity)
        expect(json["error"]["code"]).to eq("INVALID_INPUT")
      end

      # "" is the trap that 0 was: `"".present?` is false so a `present?` guard
      # waves it through, and `"" || DEFAULT` keeps the empty string because ""
      # is truthy in Ruby — landing on the same `/ 0.0` → Infinity → null.
      it "returns 422 when exchangeRate is an empty string" do
        params = valid_params.merge(exchangeRate: "")
        post "/api/v1/quotes/calculate", params: params, as: :json

        expect(response).to have_http_status(:unprocessable_entity)
        expect(json["error"]["code"]).to eq("INVALID_INPUT")
      end

      it "returns 422 when exchangeRate is not a number" do
        params = valid_params.merge(exchangeRate: "abc")
        post "/api/v1/quotes/calculate", params: params, as: :json

        expect(response).to have_http_status(:unprocessable_entity)
        expect(json["error"]["code"]).to eq("INVALID_INPUT")
      end

      it "accepts a numeric string" do
        params = valid_params.merge(exchangeRate: "1400")
        post "/api/v1/quotes/calculate", params: params, as: :json

        expect(response).to have_http_status(:ok)
      end

      it "still accepts a request that omits exchangeRate entirely" do
        params = valid_params.except(:exchangeRate)
        post "/api/v1/quotes/calculate", params: params, as: :json

        expect(response).to have_http_status(:ok)
      end
    end

    context "destination without a carrier zone" do
      # End-to-end through the real calculator: no fallback zone exists, so an
      # unmapped destination must become 422 ZONE_NOT_FOUND — never a quote
      # priced off a guessed zone.
      it "returns 422 ZONE_NOT_FOUND for a country absent from the zone table" do
        allow(QuoteCalculator).to receive(:call).and_call_original
        params = valid_params.merge(destinationCountry: "XK", overseasCarrier: "UPS")
        post "/api/v1/quotes/calculate", params: params, as: :json

        expect(response).to have_http_status(:unprocessable_entity)
        expect(json["error"]["code"]).to eq("ZONE_NOT_FOUND")
        expect(json["error"]["message"]).to include("UPS").and include("XK")
      end
    end
  end

  describe "POST /api/v1/quote_api/quotes" do
    let(:quote_api_payload) do
      {
        service_type: "express_courier",
        carrier: "UPS",
        origin: {
          country: "KR",
          city: "Changwon-si",
          postal_code: "51609",
          address: "434-2 Sinhang-ro, Jinhae-gu"
        },
        destination: {
          country: "BE",
          airport: "BRU",
          city: "Brussels"
        },
        cargo: {
          packages: [
            {
              quantity: 1,
              length_cm: 55,
              width_cm: 55,
              height_cm: 33,
              gross_weight_kg: 77
            }
          ]
        },
        terms: {
          incoterms: "DAP",
          pickup_required: true,
          customs_clearance_required: false
        },
        currency: "USD",
        requested_by: {
          company: "Naxco Belgium",
          contact: "David Van Der Snickt",
          email: "david.vandersnickt@naxco.be"
        }
      }
    end

    let(:partner_identity) { "bridgelogis@partner.quote-api" }
    let!(:partner_key) { create(:partner_api_key, margin_identity: partner_identity) }
    let(:raw_key) { partner_key.instance_variable_get(:@raw_key) }
    let(:api_key_headers) { { "X-API-Key" => raw_key } }

    # Partner default margin lives in margin_rules, not in a constant.
    let!(:partner_margin_rule) do
      MarginRule.find_or_create_by!(match_email: partner_identity, priority: 90) do |r|
        r.name = "Partner API — spec"
        r.rule_type = "flat"
        r.margin_percent = 24
        r.is_active = true
      end
    end

    # `0.presence` is 0 in Rails (0 is not blank), so a partner-supplied
    # exchange_rate of 0 passed straight through the mapper's `|| DEFAULT` and
    # the response came back with totalQuoteAmountUSD: null while the quote was
    # still saved. Rejecting it keeps a partner integration from silently
    # receiving a quote with no USD figure.
    describe "exchange_rate validation" do
      it "returns 422 when a partner supplies exchange_rate 0" do
        post "/api/v1/quote_api/quotes", params: quote_api_payload.merge(exchange_rate: 0),
             headers: api_key_headers, as: :json

        expect(response).to have_http_status(:unprocessable_entity)
        expect(json["error"]["code"]).to eq("INVALID_INPUT")
      end

      it "accepts a payload that omits exchange_rate" do
        post "/api/v1/quote_api/quotes", params: quote_api_payload,
             headers: api_key_headers, as: :json

        expect(response).to have_http_status(:created)
      end

      # Deliberately unlike the JWT endpoint, which rejects "". PartnerQuoteInput
      # normalises blanks with `.presence || DEFAULT` before validation runs, so
      # a partner sending an empty string is treated as "not supplied". Pinned
      # here so the difference is a decision rather than an accident.
      it "treats an empty exchange_rate as not supplied" do
        post "/api/v1/quote_api/quotes", params: quote_api_payload.merge(exchange_rate: ""),
             headers: api_key_headers, as: :json

        expect(response).to have_http_status(:created)
        # The point of the case: a real USD figure, not the null that Infinity
        # serialises to.
        expect(json["pricing"]["total"]).to be > 0
      end
    end

    describe "authentication" do
      it "returns 401 without any credentials" do
        post "/api/v1/quote_api/quotes", params: quote_api_payload, as: :json

        expect(response).to have_http_status(:unauthorized)
      end

      it "returns 401 for an unknown API key" do
        post "/api/v1/quote_api/quotes", params: quote_api_payload,
             headers: { "X-API-Key" => "sqp_live_not_a_real_key" }, as: :json

        expect(response).to have_http_status(:unauthorized)
      end

      it "returns 401 for a revoked API key" do
        partner_key.revoke!

        post "/api/v1/quote_api/quotes", params: quote_api_payload, headers: api_key_headers, as: :json

        expect(response).to have_http_status(:unauthorized)
      end

      it "returns 401 for an inactive API key" do
        partner_key.update!(is_active: false)

        post "/api/v1/quote_api/quotes", params: quote_api_payload, headers: api_key_headers, as: :json

        expect(response).to have_http_status(:unauthorized)
      end

      it "rejects a user JWT — this endpoint is API-key only" do
        post "/api/v1/quote_api/quotes", params: quote_api_payload, headers: admin_headers, as: :json

        expect(response).to have_http_status(:unauthorized)
      end

      it "records last_used_at on a successful call" do
        partner_key.update!(last_used_at: nil)

        expect {
          post "/api/v1/quote_api/quotes", params: quote_api_payload, headers: api_key_headers, as: :json
        }.to change { partner_key.reload.last_used_at }.from(nil)
      end
    end

    describe "margin is resolved server-side" do
      # The whole point of the partner contract: the caller must not be able to
      # set its own margin, because margin is what hides our cost basis.
      it "ignores a caller-supplied margin_percent and applies the margin rule value" do
        payload = quote_api_payload.merge(margin_percent: 0)

        post "/api/v1/quote_api/quotes", params: payload, headers: api_key_headers, as: :json

        expect(response).to have_http_status(:created)
        expect(Quote.last.margin_percent).to eq(24)
        expect(QuoteCalculator).to have_received(:call).with(hash_including("marginPercent" => 24.0))
      end

      it "tracks the margin rule rather than hardcoding 24 — changing the rule changes the quote" do
        partner_margin_rule.update!(margin_percent: 31)
        Rails.cache.delete(MarginRuleResolver::CACHE_KEY)

        post "/api/v1/quote_api/quotes", params: quote_api_payload, headers: api_key_headers, as: :json

        expect(Quote.last.margin_percent).to eq(31)
        expect(QuoteCalculator).to have_received(:call).with(hash_including("marginPercent" => 31.0))
      end

      it "falls back to the resolver default when no rule matches the key identity" do
        partner_margin_rule.update!(is_active: false)
        Rails.cache.delete(MarginRuleResolver::CACHE_KEY)

        post "/api/v1/quote_api/quotes", params: quote_api_payload, headers: api_key_headers, as: :json

        expect(Quote.last.margin_percent).to eq(MarginRuleResolver::DEFAULT_MARGIN)
      end

      it "never exposes the applied margin in the partner response" do
        post "/api/v1/quote_api/quotes", params: quote_api_payload, headers: api_key_headers, as: :json

        expect(json["pricing"].keys).to contain_exactly("currency", "total")
        expect(response.body).not_to include("margin")
        expect(response.body).not_to include("totalCost")
      end
    end

    describe "attribution" do
      it "attributes the quote to the API key, not to a user" do
        post "/api/v1/quote_api/quotes", params: quote_api_payload, headers: api_key_headers, as: :json

        expect(Quote.last.partner_api_key_id).to eq(partner_key.id)
        expect(Quote.last.user_id).to be_nil
      end

      it "writes an audit log tagged with the partner key" do
        expect {
          post "/api/v1/quote_api/quotes", params: quote_api_payload, headers: api_key_headers, as: :json
        }.to change(AuditLog, :count).by(1)

        log = AuditLog.last
        expect(log.action).to eq("quote.api_created")
        expect(log.metadata["partner_api_key_id"]).to eq(partner_key.id)
        expect(log.metadata["source"]).to eq("quote_api_v1")
      end
    end

    it "creates a saved quote from email-automation API payload and returns partner-safe USD response" do
      post "/api/v1/quote_api/quotes", params: quote_api_payload, headers: api_key_headers, as: :json

      expect(response).to have_http_status(:created)
      expect(QuoteCalculator).to have_received(:call).with(hash_including(
        "destinationCountry" => "BE",
        "overseasCarrier" => "UPS",
        "incoterm" => "DAP",
        "items" => [ hash_including("quantity" => 1, "weight" => 77, "length" => 55, "width" => 55, "height" => 33) ]
      ))
      expect(Quote.last.notes).to include("BridgeLogis Quote API v1")

      expect(json["quote_id"]).to match(/\ASQ-\d{4}-\d{4}\z/)
      expect(json["status"]).to eq("quoted")
      expect(json["service"]).to include("provider" => "BridgeLogis", "carrier" => "UPS")
      expect(json["route"]).to include("origin_country" => "KR", "destination_country" => "BE", "destination_airport" => "BRU")
      expect(json["cargo_summary"]).to include("gross_weight_kg" => 77.0, "chargeable_weight_kg" => 15.5)
      expect(json["pricing"]).to include("currency" => "USD", "total" => 1150.5)
      expect(json["pricing"]).not_to have_key("total_krw")
      expect(json["conditions"].join(" ")).to include("final carrier confirmation")
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

    context "stale draft auto-expiration" do
      it "expires stale drafts and records an audit log per transition" do
        stale = create(:quote, user: user, status: "draft", validity_date: 2.days.ago.to_date)
        stale_sent = create(:quote, user: user, status: "sent", validity_date: 1.day.ago.to_date)
        fresh = create(:quote, user: user, status: "draft", validity_date: 3.days.from_now.to_date)

        expect {
          get "/api/v1/quotes", headers: user_headers
        }.to change { AuditLog.where(action: "quote.auto_expired").count }.by(2)

        expect(stale.reload.status).to eq("expired")
        expect(stale_sent.reload.status).to eq("expired")
        expect(fresh.reload.status).to eq("draft")

        log = AuditLog.find_by(action: "quote.auto_expired", resource_id: stale.id)
        expect(log.resource_ref).to eq(stale.reference_no)
        expect(log.metadata).to include("status_from" => "draft", "status_to" => "expired")
      end

      it "does not expire other users' quotes on a member listing" do
        other_stale = create(:quote, user: admin, status: "draft", validity_date: 2.days.ago.to_date)

        get "/api/v1/quotes", headers: user_headers

        expect(other_stale.reload.status).to eq("draft")
      end

      it "does not write audit logs when nothing is stale" do
        create(:quote, user: user, status: "draft", validity_date: 3.days.from_now.to_date)

        expect {
          get "/api/v1/quotes", headers: user_headers
        }.not_to change { AuditLog.count }
      end
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

  describe "POST /api/v1/quotes/:id/send_email" do
    let(:mail) { instance_double(ActionMailer::MessageDelivery, deliver_later: true) }

    before do
      allow(QuoteMailer).to receive(:send_quote).and_return(mail)
    end

    it "rejects a missing or malformed recipient email" do
      quote = create(:quote, user: user)

      post "/api/v1/quotes/#{quote.id}/send_email", params: { recipientEmail: "not-an-email" },
           headers: user_headers, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(json.dig("error", "code")).to eq("INVALID_EMAIL")
      expect(QuoteMailer).not_to have_received(:send_quote)
    end

    it "returns 404 for another user's quote" do
      quote = create(:quote, user: admin)

      post "/api/v1/quotes/#{quote.id}/send_email", params: { recipientEmail: "a@b.com" },
           headers: user_headers, as: :json

      expect(response).to have_http_status(:not_found)
    end

    it "sends the quote, transitions draft to sent, and records an audit log" do
      quote = create(:quote, user: user, status: "draft")

      expect {
        post "/api/v1/quotes/#{quote.id}/send_email",
             params: { recipientEmail: "client@example.com", recipientName: "Client" },
             headers: user_headers, as: :json
      }.to change { AuditLog.where(action: "quote.email_sent").count }.by(1)

      expect(response).to have_http_status(:ok)
      expect(QuoteMailer).to have_received(:send_quote)
        .with(quote, "client@example.com", recipient_name: "Client", message: nil)
      expect(mail).to have_received(:deliver_later)
      expect(quote.reload.status).to eq("sent")
    end

    it "does not change a non-draft status" do
      quote = create(:quote, user: user, status: "accepted")

      post "/api/v1/quotes/#{quote.id}/send_email", params: { recipientEmail: "a@b.com" },
           headers: user_headers, as: :json

      expect(quote.reload.status).to eq("accepted")
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

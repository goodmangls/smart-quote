require "rails_helper"

# `GET /shared/:token` is UNAUTHENTICATED and its audience is the customer being
# quoted. It used to render `QuoteSerializer.detail`, which shipped our internal
# cost and margin in the response body — invisible on the page, readable in
# DevTools by anyone holding the link.
#
# These assert the RESPONSE BODY, not the rendered page, because that is where
# the leak lived.
RSpec.describe "Api::V1::QuoteShares", type: :request do
  let(:admin) { create(:user, :admin) }
  let(:admin_headers) { auth_headers(jwt_token_for(admin)) }

  let(:quote) do
    create(
      :quote,
      user: admin,
      total_cost_amount: 1_200_000,
      profit_amount: 300_000,
      profit_margin: 20.0,
      margin_percent: 24.0,
      overseas_carrier: "DHL",
      transit_time: "2-3 days",
      applied_zone: "Z5"
    )
  end

  def json
    JSON.parse(response.body)
  end

  def share_token
    post "/api/v1/quotes/#{quote.id}/share", headers: admin_headers, as: :json
    JSON.parse(response.body).fetch("shareUrl").split("/").last
  end

  describe "GET /api/v1/shared/:token" do
    before { get "/api/v1/shared/#{share_token}" }

    it "is reachable without authentication" do
      expect(response).to have_http_status(:ok)
    end

    # The whole point of the fix.
    it "never exposes internal cost or margin" do
      %w[totalCostAmount profitAmount profitMargin marginPercent].each do |leaked|
        expect(json).not_to have_key(leaked), "#{leaked} must not reach a share link"
      end
    end

    it "never exposes the cost breakdown" do
      # `breakdown` carries intlBase — the carrier rate before margin.
      expect(json).not_to have_key("breakdown")
    end

    it "never exposes internal operational fields" do
      %w[notes customerId customerName exchangeRate fscPercent
         manualDomesticCost manualPackingCost dutyTaxEstimate].each do |leaked|
        expect(json).not_to have_key(leaked), "#{leaked} must not reach a share link"
      end
    end

    it "sends exactly the customer-facing contract and nothing more" do
      # Pinned as an exact set: a field added to the serializer later has to be
      # a deliberate decision, not something that arrives by inheritance.
      expect(json.keys).to match_array(
        %w[referenceNo originCountry destinationCountry destinationZip
           overseasCarrier totalQuoteAmount totalQuoteAmountUsd appliedZone
           transitTime incoterm billableWeight createdAt validityDate shared]
      )
    end

    # These three were missing from the old payload, so the page rendered
    # `undefined` for them — `totalQuoteAmountUsd` crashed the USD display.
    it "supplies the fields the shared page actually reads" do
      expect(json["totalQuoteAmountUsd"]).to be_a(Numeric)
      expect(json["overseasCarrier"]).to eq("DHL")
      expect(json["transitTime"]).to eq("2-3 days")
    end

    it "marks the payload as shared" do
      expect(json["shared"]).to be(true)
    end
  end
end

require "rails_helper"

# POST /api/v1/quotes/calculate is public, but the response is not the same for
# every caller. An admin gets the full QuoteCalculator output and may choose the
# margin. Everyone else — no token, an invalid token, a member — gets an explicit
# allowlist of customer-facing fields, priced at the server-side margin.
#
# These run through the real calculator (no stub): the point is what actually
# leaves the server, and a stubbed result would only prove the stub.
RSpec.describe "POST /api/v1/quotes/calculate (public shape)", type: :request do
  let(:admin) { create(:user, :admin) }
  let(:member) { create(:user) }
  let(:admin_headers) { auth_headers(jwt_token_for(admin)) }
  let(:member_headers) { auth_headers(jwt_token_for(member)) }
  let(:invalid_headers) { auth_headers("not.a.jwt") }

  let(:public_keys) do
    %w[totalQuoteAmount totalQuoteAmountUSD currency billableWeight totalActualWeight
       totalVolumetricWeight appliedZone transitTime carrier appliedFscPercent warnings]
  end

  let(:params) do
    {
      destinationCountry: "US",
      destinationZip: "10001",
      domesticRegionCode: "A",
      incoterm: "FOB",
      packingType: "NONE",
      exchangeRate: 1300.0,
      fscPercent: 27.5,
      items: [
        { name: "Electronic Parts", quantity: 2, weight: 5.0, length: 40, width: 30, height: 20 }
      ]
    }
  end

  def json
    JSON.parse(response.body)
  end

  def post_calculate(payload, headers: {})
    post "/api/v1/quotes/calculate", params: payload, headers: headers, as: :json
  end

  # Every key at every depth of the parsed body.
  def all_keys(node, acc = [])
    case node
    when Hash
      node.each do |key, value|
        acc << key
        all_keys(value, acc)
      end
    when Array
      node.each { |value| all_keys(value, acc) }
    end
    acc
  end

  shared_examples "the public shape" do
    it "answers 200 with exactly the allowlisted keys" do
      post_calculate(params, headers: headers)

      expect(response).to have_http_status(:ok)
      expect(json.keys).to match_array(public_keys)
    end

    it "carries no cost, margin, profit or breakdown key anywhere in the body" do
      post_calculate(params, headers: headers)

      expect(all_keys(json).grep(/cost|margin|profit|breakdown|intlBase/i)).to be_empty
    end

    it "ignores a caller-supplied marginPercent of 0" do
      post_calculate(params, headers: headers)
      omitted = json["totalQuoteAmount"]

      post_calculate(params.merge(marginPercent: 0), headers: headers)

      expect(json["totalQuoteAmount"]).to eq(omitted)
    end

    it "ignores a caller-supplied marginPercent of 80" do
      post_calculate(params, headers: headers)
      omitted = json["totalQuoteAmount"]

      post_calculate(params.merge(marginPercent: 80), headers: headers)

      expect(json["totalQuoteAmount"]).to eq(omitted)
    end

    it "resolves the margin server-side with no identity" do
      expect(MarginRuleResolver).to receive(:resolve)
        .with(email: nil, nationality: nil, weight: 10.0)
        .and_call_original

      post_calculate(params.merge(marginPercent: 0), headers: headers)
    end

    it "reports the explicit fscPercent that was applied" do
      post_calculate(params, headers: headers)

      expect(json["appliedFscPercent"]).to eq(27.5)
    end

    it "reports the carrier default when fscPercent is omitted" do
      expected = FscFetcher.current_rates.dig("UPS", "international").to_f
      expect(expected).to be > 0

      post_calculate(params.except(:fscPercent), headers: headers)

      expect(json["appliedFscPercent"]).to eq(expected)
    end

    it "reports the stored DB rate when fscPercent is omitted" do
      FscRate.find_or_initialize_by(carrier: "UPS").update!(
        international: 33.0, domestic: 33.0, source: "manual"
      )

      post_calculate(params.except(:fscPercent), headers: headers)

      expect(json["appliedFscPercent"]).to eq(33.0)
    end

    it "keeps the error contract for rejected input (422, not 401)" do
      post_calculate(params.except(:destinationCountry), headers: headers)

      expect(response).to have_http_status(:unprocessable_content)
      expect(json["error"]["code"]).to eq("INVALID_INPUT")
    end
  end

  context "as an anonymous caller (no token)" do
    let(:headers) { {} }

    it_behaves_like "the public shape"

    it "drops a margin warning the calculator produced" do
      seen = nil
      allow(QuoteCalculator).to receive(:call).and_wrap_original do |original, input|
        seen = original.call(input)
      end
      allow(MarginRuleResolver).to receive(:resolve).and_return(
        { margin_percent: 5.0, matched_rule: nil, fallback: false }
      )

      post_calculate(params)

      expect(seen[:warnings].grep(/Low Margin/)).not_to be_empty
      expect(json["warnings"].grep(/margin|profit|cost/i)).to be_empty
    end
  end

  context "with an invalid token" do
    let(:headers) { invalid_headers }

    it_behaves_like "the public shape"
  end

  context "as a non-admin member" do
    let(:headers) { member_headers }

    it_behaves_like "the public shape"
  end

  context "as an admin" do
    it "gets the full response including totalCostAmount and breakdown" do
      post_calculate(params, headers: admin_headers)

      expect(response).to have_http_status(:ok)
      expect(json).to include("totalCostAmount", "profitAmount", "profitMargin", "breakdown")
      expect(json.dig("breakdown", "totalCost")).to be_present
    end

    it "honors a caller-supplied marginPercent of 0" do
      post_calculate(params.merge(marginPercent: 0), headers: admin_headers)

      expect(json["profitMargin"]).to eq(0.0)
      expect(json["profitAmount"]).to eq(0)
    end

    it "honors a caller-supplied marginPercent of 15" do
      post_calculate(params.merge(marginPercent: 15), headers: admin_headers)

      expect(json["profitMargin"]).to eq(15.0)
    end

    it "still sees the Low Margin warning" do
      post_calculate(params.merge(marginPercent: 5), headers: admin_headers)

      expect(json["warnings"].grep(/Low Margin/)).not_to be_empty
    end
  end
end

require "rails_helper"

# The frontend has called POST /api/v1/notifications/slack after every member
# quote save since the feature shipped, but the route never existed — the 404
# was swallowed as "best-effort" and no alert was ever delivered.
#
# The endpoint is server-authoritative: the client sends only `referenceNo`, and
# the message is built from the stored quote. Forwarding client-supplied text
# would let any logged-in user post arbitrary content (including <!channel>
# mentions) into the company Slack.
RSpec.describe "Api::V1::Notifications", type: :request do
  let(:webhook_url) { "https://hooks.slack.test/services/T000/B000/XXXX" }
  let(:member) do
    create(:user, role: "member", name: "Kim <!channel>", company: "Acme & Co", email: "buyer@acme.test")
  end
  let(:headers) { auth_headers(jwt_token_for(member)) }
  let(:quote) do
    create(
      :quote,
      user: member,
      overseas_carrier: "DHL",
      destination_country: "DE",
      billable_weight: 12.5,
      total_quote_amount: 1_234_500,
      total_quote_amount_usd: 935.23,
      profit_margin: 18.4
    )
  end
  let(:slack_ok) { Net::HTTPOK.new("1.1", "200", "OK") }
  let(:sent_bodies) { [] }

  def post_notification(ref = quote.reference_no, as_headers: headers)
    post "/api/v1/notifications/slack", params: { referenceNo: ref }, headers: as_headers, as: :json
  end

  before do
    Rails.cache.clear
    allow(ENV).to receive(:[]).and_call_original
    allow(ENV).to receive(:[]).with("SLACK_WEBHOOK_URL").and_return(webhook_url)
    allow_any_instance_of(Net::HTTP).to receive(:request) do |_http, req|
      sent_bodies << JSON.parse(req.body)
      slack_ok
    end
  end

  it "requires authentication" do
    post "/api/v1/notifications/slack", params: { referenceNo: quote.reference_no }, as: :json

    expect(response).to have_http_status(:unauthorized)
    expect(sent_bodies).to be_empty
  end

  it "posts a message built from the stored quote, not from client text" do
    post "/api/v1/notifications/slack",
         params: { referenceNo: quote.reference_no, totalQuote: "₩1 (forged)", member: "<!here> spoof" },
         headers: headers, as: :json

    expect(response).to have_http_status(:ok)
    text = sent_bodies.sole.fetch("text")
    expect(text).to include(quote.reference_no, "DHL", "DE", "12.5", "₩1,234,500", "$935.23", "18.4%")
    expect(text).not_to include("forged", "spoof")
  end

  it "escapes user-controlled fields so they cannot trigger mentions" do
    post_notification

    text = sent_bodies.sole.fetch("text")
    expect(text).not_to include("<!channel>")
    expect(text).to include("Kim &lt;!channel&gt;", "Acme &amp; Co")
  end

  it "escapes stored quote fields too, even values that predate carrier validation" do
    # update_column skips validation — stands in for a row saved before the allowlist.
    quote.update_column(:overseas_carrier, "<!channel>")
    quote.update_column(:destination_country, "<@U")

    post_notification

    text = sent_bodies.sole.fetch("text")
    expect(text).not_to include("<!channel>", "<@U")
    expect(text).to include("Carrier: &lt;!channel&gt; → &lt;@U")
  end

  it "masks the member email" do
    post_notification

    text = sent_bodies.sole.fetch("text")
    expect(text).to include("b***@acme.test")
    expect(text).not_to include("buyer@acme.test")
  end

  it "returns 404 for a quote owned by someone else" do
    other = create(:quote, user: create(:user, role: "member"))

    post_notification(other.reference_no)

    expect(response).to have_http_status(:not_found)
    expect(sent_bodies).to be_empty
  end

  it "requires referenceNo" do
    post "/api/v1/notifications/slack", params: {}, headers: headers, as: :json

    expect(response).to have_http_status(:bad_request)
    expect(sent_bodies).to be_empty
  end

  it "sends at most one alert per quote" do
    post_notification
    post_notification

    expect(response).to have_http_status(:ok)
    expect(JSON.parse(response.body)).to include("duplicate" => true)
    expect(sent_bodies.size).to eq(1)
  end

  it "returns 503 when the webhook is not configured, so the failure is visible" do
    allow(ENV).to receive(:[]).with("SLACK_WEBHOOK_URL").and_return(nil)

    post_notification

    expect(response).to have_http_status(:service_unavailable)
    expect(JSON.parse(response.body).dig("error", "code")).to eq("SLACK_NOT_CONFIGURED")
    expect(sent_bodies).to be_empty
  end

  it "returns 502 when Slack rejects the message, and allows a retry" do
    rejected = Net::HTTPBadRequest.new("1.1", "400", "Bad Request")
    allow(rejected).to receive(:body).and_return("invalid_payload")
    allow_any_instance_of(Net::HTTP).to receive(:request).and_return(rejected)

    post_notification
    expect(response).to have_http_status(:bad_gateway)

    allow_any_instance_of(Net::HTTP).to receive(:request).and_return(slack_ok)
    post_notification
    expect(response).to have_http_status(:ok)
    expect(JSON.parse(response.body)).to include("duplicate" => false)
  end

  it "returns 502 when Slack is unreachable" do
    allow_any_instance_of(Net::HTTP).to receive(:request).and_raise(Net::OpenTimeout)

    post_notification

    expect(response).to have_http_status(:bad_gateway)
  end
end

# Posts a plain-text message to the incoming webhook in SLACK_WEBHOOK_URL.
#
# The URL lives only in the backend environment (Render). It was once exposed as
# VITE_SLACK_WEBHOOK_URL on Vercel, where any frontend reference would have
# inlined it into the public bundle.
class SlackNotifier
  class NotConfigured < StandardError; end
  class DeliveryFailed < StandardError; end

  TIMEOUT_SECONDS = 5

  def self.deliver(text)
    new(ENV["SLACK_WEBHOOK_URL"]).deliver(text)
  end

  # Slack mrkdwn treats &, < and > as control characters — `<!channel>` is a
  # mention and `<url|label>` a link. Escape anything a user can type.
  def self.escape(value)
    value.to_s.gsub("&", "&amp;").gsub("<", "&lt;").gsub(">", "&gt;")
  end

  def initialize(webhook_url)
    @webhook_url = webhook_url
  end

  def deliver(text)
    raise NotConfigured, "SLACK_WEBHOOK_URL is not set" if @webhook_url.blank?

    uri = URI(@webhook_url)
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = uri.scheme == "https"
    http.open_timeout = TIMEOUT_SECONDS
    http.read_timeout = TIMEOUT_SECONDS

    request = Net::HTTP::Post.new(uri)
    request["Content-Type"] = "application/json"
    request.body = { text: text }.to_json

    response = http.request(request)
    return if response.is_a?(Net::HTTPSuccess)

    raise DeliveryFailed, "Slack responded #{response.code}: #{response.body.to_s.truncate(200)}"
  rescue Net::OpenTimeout, Net::ReadTimeout, SocketError, SystemCallError, OpenSSL::SSL::SSLError => e
    raise DeliveryFailed, "Slack unreachable: #{e.class}"
  end
end

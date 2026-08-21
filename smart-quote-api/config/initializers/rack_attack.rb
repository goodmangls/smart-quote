class Rack::Attack
  # Throttle login attempts: 5 per minute per IP
  throttle("auth/login", limit: 5, period: 60) do |req|
    req.ip if req.path == "/api/v1/auth/login" && req.post?
  end

  # Throttle registration: 3 per hour per IP
  throttle("auth/register", limit: 3, period: 3600) do |req|
    req.ip if req.path == "/api/v1/auth/register" && req.post?
  end

  # Throttle password change: 5 per minute per IP (brute-force protection)
  throttle("auth/password", limit: 5, period: 60) do |req|
    req.ip if req.path == "/api/v1/auth/password" && req.put?
  end

  # Throttle token refresh: 30 per minute per IP
  throttle("auth/refresh", limit: 30, period: 60) do |req|
    req.ip if req.path == "/api/v1/auth/refresh" && req.post?
  end

  # Throttle magic link request by IP: 10 per hour (prevent IP-based spam)
  throttle("auth/magic_link/ip", limit: 10, period: 1.hour) do |req|
    req.ip if req.path == "/api/v1/auth/magic_link" && req.post?
  end

  # Throttle magic link request by email: 5 per hour (prevent targeted email bombs)
  throttle("auth/magic_link/email", limit: 5, period: 1.hour) do |req|
    if req.path == "/api/v1/auth/magic_link" && req.post?
      begin
        body = req.body.read
        req.body.rewind
        parsed = JSON.parse(body)
        parsed["email"]&.to_s&.downcase&.strip.presence
      rescue JSON::ParserError
        nil
      end
    end
  end

  # Throttle magic link verification: 20 per minute per IP (brute force)
  #
  # A magic link token is credential-equivalent — whoever presents a valid one
  # gets a session — so this is the same class of protection as auth/login.
  # The method matters: this read `req.get?` until 2026-08-21, while the
  # frontend has POSTed since 2026-08-17, so the live path was bounded only by
  # the general 300/minute rule. Verification is POST-only now; if a GET form
  # is ever reintroduced, drop the method check rather than adding a branch.
  throttle("auth/magic_link/verify", limit: 20, period: 60) do |req|
    req.ip if req.path == "/api/v1/auth/magic_link/verify" && req.post?
  end

  # Throttle public calculate endpoint: 60 per minute per IP
  throttle("quotes/calculate", limit: 60, period: 60) do |req|
    req.ip if req.path == "/api/v1/quotes/calculate" && req.post?
  end

  # General API throttle: 300 requests per minute per IP
  throttle("api/general", limit: 300, period: 60) do |req|
    req.ip if req.path.start_with?("/api/")
  end

  # Partner quote API — throttled per API key rather than per IP, because a
  # partner's automation may sit behind one egress IP while several partners can
  # share one. Starts deliberately low; raising it is a one-line config change.
  #
  # The discriminator is a digest, never the raw key: throttle keys are written
  # to the cache backend and would otherwise leak partner credentials there.
  PARTNER_QUOTE_API_PATH = "/api/v1/quote_api/quotes"

  def self.partner_api_key_discriminator(req)
    return nil unless req.path == PARTNER_QUOTE_API_PATH && req.post?

    raw = req.env["HTTP_X_API_KEY"].presence
    raw && Digest::SHA256.hexdigest(raw)[0, 32]
  end

  throttle("quote_api/minute", limit: 30, period: 60) do |req|
    partner_api_key_discriminator(req)
  end

  throttle("quote_api/day", limit: 500, period: 1.day) do |req|
    partner_api_key_discriminator(req)
  end

  # Return JSON error response
  self.throttled_responder = lambda do |_req|
    [
      429,
      { "Content-Type" => "application/json" },
      [ { error: { code: "RATE_LIMITED", message: "Too many requests. Please try again later." } }.to_json ]
    ]
  end
end

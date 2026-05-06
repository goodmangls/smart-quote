# Comma-separated exact origins. Vercel production + every deployment URL
# (…-hash-team.vercel.app) is covered by SMART_QUOTE_VERCEL_ORIGIN below unless
# CORS_DISABLE_VERCEL_REGEX=1 (e.g. forked deployments under another team slug).
DEFAULT_CORS_ORIGINS = %w[
  https://smart-quote-main.vercel.app
  https://smart-quote-main-jlinsights-projects.vercel.app
  https://bridgelogis.com
  https://www.bridgelogis.com
].join(",").freeze

# smart-quote-main.vercel.app and smart-quote-main-*-*-….vercel.app (preview/prod aliases)
SMART_QUOTE_VERCEL_ORIGIN = %r{\Ahttps://smart-quote-main(-[\w.-]+)?\.vercel\.app\z}i.freeze

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    allowed = ENV.fetch("CORS_ORIGINS", DEFAULT_CORS_ORIGINS).split(",").map(&:strip)

    # Safety: reject localhost in production
    if Rails.env.production? && allowed.any? { |o| o.include?("localhost") }
      Rails.logger.error "[CORS] SECURITY: localhost origin detected in production CORS_ORIGINS!"
      allowed.reject! { |o| o.include?("localhost") }
    end

    allowed += [ "http://localhost:5173", "http://localhost:3000" ] if Rails.env.development?

    origin_specs = allowed.dup
    if Rails.env.production? && ENV["CORS_DISABLE_VERCEL_REGEX"] != "1"
      origin_specs << SMART_QUOTE_VERCEL_ORIGIN
    end

    origins(*origin_specs)

    resource "*",
      headers: :any,
      expose: [ "Authorization" ],
      methods: [ :get, :post, :put, :patch, :delete, :options, :head ],
      # insights-admin-rails-auth: bl_session httpOnly cookie 가 cross-origin
      # fetch 시에도 저장/전송되려면 credentials: true 가 필수. 메인 SPA fetch
      # 도 `credentials: 'include'` 로 호출해야 한다.
      credentials: true
  end
end

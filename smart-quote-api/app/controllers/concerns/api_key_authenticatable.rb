# frozen_string_literal: true

# Authenticates partner integrations via an `X-API-Key` header.
#
# Deliberately separate from JwtAuthenticatable: partner traffic is machine
# traffic with no user session, and quotes it creates are attributed to the key
# rather than to a person (quotes.user_id stays NULL).
module ApiKeyAuthenticatable
  extend ActiveSupport::Concern

  private

  def authenticate_api_key!
    @current_api_key = PartnerApiKey.authenticate(extract_api_key)

    if @current_api_key
      @current_api_key.touch_last_used!
    else
      render json: {
        error: { code: "UNAUTHORIZED", message: "Valid X-API-Key header required" }
      }, status: :unauthorized
    end
  end

  def current_api_key
    @current_api_key
  end

  def extract_api_key
    request.headers["X-API-Key"].presence
  end
end

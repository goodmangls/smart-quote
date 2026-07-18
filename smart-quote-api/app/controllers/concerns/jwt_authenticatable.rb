module JwtAuthenticatable
  extend ActiveSupport::Concern

  private

  def authenticate_user!
    @current_user = user_from_token
    render_unauthorized unless @current_user
  end

  def current_user
    @current_user
  end

  def user_from_token
    token = extract_token
    return nil unless token

    payload = decode_access_payload(token)
    return nil unless payload
    return nil if jti_revoked?(payload["jti"])

    User.find_by(id: payload["user_id"])
  end

  def encode_token(user)
    payload = {
      user_id: user.id,
      role: user.role,
      jti: SecureRandom.uuid,
      exp: 15.minutes.from_now.to_i
    }
    JWT.encode(payload, jwt_secret, "HS256")
  end

  def encode_refresh_token(user)
    payload = {
      user_id: user.id,
      type: "refresh",
      jti: SecureRandom.uuid,
      exp: 7.days.from_now.to_i
    }
    JWT.encode(payload, jwt_secret, "HS256")
  end

  def decode_refresh_token(token)
    payload = decode_jwt_payload(token)
    return nil unless payload
    return nil unless payload["type"] == "refresh"
    return nil if payload["exp"].to_i < Time.current.to_i
    return nil if jti_revoked?(payload["jti"])

    User.find_by(id: payload["user_id"])
  end

  # Revoke a JWT by jti until its natural expiry (Rails.cache TTL).
  def revoke_token!(token)
    payload = decode_jwt_payload(token)
    return unless payload

    revoke_jti!(payload["jti"], exp: payload["exp"].to_i)
  end

  def revoke_jti!(jti, exp:)
    return if jti.blank?

    ttl = exp - Time.current.to_i
    return if ttl <= 0

    Rails.cache.write(denylist_key(jti), true, expires_in: ttl.seconds)
  end

  def jti_revoked?(jti)
    jti.present? && Rails.cache.exist?(denylist_key(jti))
  end

  def denylist_key(jti)
    "jwt:denylist:#{jti}"
  end

  def decode_access_payload(token)
    payload = decode_jwt_payload(token)
    return nil unless payload
    return nil if payload["type"] == "refresh"
    return nil if payload["exp"].to_i < Time.current.to_i

    payload
  end

  def decode_jwt_payload(token)
    return nil if token.blank?

    JWT.decode(token, jwt_secret, true, algorithm: "HS256")[0]
  rescue JWT::DecodeError => e
    Rails.logger.warn "[AUTH] JWT decode failed: #{e.message} | IP: #{request.remote_ip}"
    nil
  rescue JWT::ExpiredSignature
    Rails.logger.info "[AUTH] JWT expired | IP: #{request.remote_ip}"
    nil
  end

  def extract_token
    header = request.headers["Authorization"]
    header&.split(" ")&.last
  end

  def jwt_secret
    Rails.application.credentials.secret_key_base || Rails.application.secret_key_base
  end

  def require_admin!
    authenticate_user!
    return if performed?
    unless current_user&.role == "admin"
      render json: { error: { code: "FORBIDDEN", message: "Admin only" } }, status: :forbidden
    end
  end

  def render_unauthorized
    render json: {
      error: { code: "UNAUTHORIZED", message: "Unauthorized" }
    }, status: :unauthorized
  end

  def user_json(user)
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      company: user.company,
      nationality: user.nationality,
      networks: user.networks,
      intercom_hash: intercom_hash(user)
    }
  end

  def intercom_hash(user)
    return nil if ENV["INTERCOM_SECRET_KEY"].blank?

    OpenSSL::HMAC.hexdigest(
      "SHA256",
      ENV["INTERCOM_SECRET_KEY"],
      user.id.to_s
    )
  end
end

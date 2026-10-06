module JwtAuthenticatable
  extend ActiveSupport::Concern

  # Never read from credentials: config/master.key was committed to a public
  # repository, so config/credentials.yml.enc must be treated as public.
  # Production signs with SECRET_KEY_BASE (Render generates it) and fails
  # closed when it is missing rather than falling back to credentials, which
  # is what Rails.application.secret_key_base would do.
  def self.signing_secret
    if Rails.env.production?
      ENV.fetch("SECRET_KEY_BASE").presence || raise(KeyError, "SECRET_KEY_BASE is blank")
    else
      Rails.application.secret_key_base
    end
  end

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

  # Revoke a JWT by jti until its natural expiry. Kept in the database, not
  # Rails.cache: production's cache is per-process memory, emptied by every
  # redeploy and spin-down, which made revoked refresh tokens valid again.
  def revoke_token!(token)
    payload = decode_jwt_payload(token)
    return unless payload

    RevokedToken.revoke!(payload["jti"], expires_at: Time.zone.at(payload["exp"].to_i))
  end

  def jti_revoked?(jti)
    RevokedToken.revoked?(jti)
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
    JwtAuthenticatable.signing_secret
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

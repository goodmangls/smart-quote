module JwtHelpers
  def jwt_token_for(user, exp: 24.hours.from_now.to_i)
    payload = { user_id: user.id, role: user.role, exp: exp }
    JWT.encode(payload, JwtAuthenticatable.signing_secret, "HS256")
  end

  def auth_headers(token)
    { "Authorization" => "Bearer #{token}" }
  end
end

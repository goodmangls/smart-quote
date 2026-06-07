module Api
  module V1
    class AuthController < ApplicationController
      include JwtAuthenticatable
      # ActionController::API 는 cookies helper 미포함 — refresh_token HttpOnly cookie 발급용으로 명시 include
      include ActionController::Cookies
      before_action :authenticate_user!, only: [ :update_password, :me ]
      before_action :verify_trusted_origin!, only: [ :register, :login, :refresh, :logout, :request_magic_link, :verify_magic_link ]

      # POST /api/v1/auth/register
      def register
        user = User.new(register_params)

        if user.save
          render_auth_response(user, status: :created)
        else
          render json: {
            error: { code: "VALIDATION_ERROR", message: user.errors.full_messages.join(", ") }
          }, status: :unprocessable_entity
        end
      end

      # POST /api/v1/auth/login
      def login
        user = User.find_by(email: params[:email]&.downcase&.strip)

        if user&.authenticate(params[:password])
          render_auth_response(user)
        else
          render json: {
            error: { code: "UNAUTHORIZED", message: "Invalid email or password" }
          }, status: :unauthorized
        end
      end

      # GET /api/v1/auth/me
      def me
        render json: { user: user_json(current_user) }
      end

      # POST /api/v1/auth/refresh — issue new access token + rotated refresh token
      # Security: refresh token rotation (OAuth 2.0 Security BCP, RFC 9700).
      # 매 refresh 호출마다 새 refresh token 발급. 이전 token 은 expiry 까지 유효.
      # Level 2 (jti denylist 로 즉시 무효화)는 후속 작업.
      def refresh
        user = decode_refresh_token(refresh_token_from_cookie)

        if user
          render_auth_response(user)
        else
          clear_refresh_cookie
          render json: { error: { code: "INVALID_TOKEN", message: "Invalid or expired refresh token" } }, status: :unauthorized
        end
      end

      # POST /api/v1/auth/logout — clear bl_session httpOnly cookie
      # 클라이언트는 httpOnly cookie 를 직접 못 지우므로 서버가 만료 cookie 로 덮어씀.
      # access/refresh JWT 자체의 즉시 무효화는 별도 사이클(jti denylist).
      # 항상 200 — 비로그인 상태에서도 idempotent.
      def logout
        clear_refresh_cookie
        render json: { message: "Logged out" }
      end

      # PUT /api/v1/auth/password — change password (authenticated)
      def update_password
        authenticate_user!
        return if performed?

        unless current_user.authenticate(params[:current_password])
          return render json: { error: { code: "INVALID_PASSWORD", message: "Current password is incorrect" } }, status: :unprocessable_entity
        end

        if params[:password].blank? || params[:password] != params[:password_confirmation]
          return render json: { error: { code: "VALIDATION_ERROR", message: "Password confirmation does not match" } }, status: :unprocessable_entity
        end

        if current_user.update(password: params[:password])
          render json: { message: "Password updated successfully" }
        else
          render json: { error: { code: "VALIDATION_ERROR", message: current_user.errors.full_messages.join(", ") } }, status: :unprocessable_entity
        end
      end

      # POST /api/v1/auth/magic_link — request a magic link email
      def request_magic_link
        user = User.find_by(email: params[:email]&.downcase&.strip)

        if user
          raw_token = user.generate_magic_link_token!
          AuthMailer.magic_link(user, raw_token).deliver_now
        end

        # Always return 200 to prevent email enumeration
        render json: { message: "If that email exists, a login link has been sent." }
      end

      # GET /api/v1/auth/magic_link/verify?token=...
      def verify_magic_link
        token = params[:token].to_s
        digest = Digest::SHA256.hexdigest(token)
        user = User.find_by(magic_link_token_digest: digest)

        unless user&.magic_link_valid?(token)
          return render json: {
            error: { code: "INVALID_TOKEN", message: "Invalid or expired magic link" }
          }, status: :unauthorized
        end

        user.consume_magic_link_token!
        render_auth_response(user)
      end

      # GET /api/v1/auth/magic_link/peek — test-only: return last issued raw token
      def peek_magic_link
        return head :not_found unless Rails.env.test?

        last = ActionMailer::Base.deliveries.last
        return render json: { token: nil } unless last

        match = last.body.encoded.match(/\?token=([^\s"'<&]+)/)
        render json: { token: match&.[](1) }
      end

      # POST /api/v1/auth/promote — one-time admin promotion (secret-protected)
      def promote
        secret = ENV["ADMIN_PROMOTE_SECRET"]
        if secret.blank? || params[:secret] != secret
          return render json: { error: { code: "FORBIDDEN", message: "Forbidden" } }, status: :forbidden
        end

        user = User.find_by(email: params[:email]&.downcase&.strip)
        if user.nil?
          return render json: { error: { code: "NOT_FOUND", message: "User not found" } }, status: :not_found
        end

        user.update!(role: "admin")
        render json: { message: "#{user.email} promoted to admin", role: user.role }
      end

      private

      def register_params
        params.permit(:email, :password, :password_confirmation,
                      :name, :company, :nationality, networks: [])
      end

      def render_auth_response(user, status: :ok)
        set_refresh_cookie(encode_refresh_token(user))
        render json: { token: encode_token(user), user: user_json(user) }, status: status
      end

      def refresh_token_from_cookie
        cookies[:refresh_token]
      end

      def set_refresh_cookie(token)
        cookies[:refresh_token] = refresh_cookie_options.merge(value: token)
      end

      def clear_refresh_cookie
        cookies.delete(:refresh_token, refresh_cookie_options.except(:value, :expires))
      end

      def refresh_cookie_options
        {
          httponly: true,
          secure: refresh_cookie_secure?,
          same_site: refresh_cookie_same_site,
          expires: 7.days.from_now,
          path: "/api/v1/auth"
        }
      end

      def refresh_cookie_secure?
        ENV.fetch("REFRESH_COOKIE_SECURE", Rails.env.production? ? "true" : "false") == "true"
      end

      def refresh_cookie_same_site
        ENV.fetch("REFRESH_COOKIE_SAME_SITE", Rails.env.production? ? "None" : "Lax").downcase.to_sym
      end

      def verify_trusted_origin!
        return unless Rails.env.production? || ENV["AUTH_ORIGIN_CHECK"] == "true"

        origin = request.headers["Origin"]
        return if origin.blank?

        allowed_origins = ENV.fetch(
          "CORS_ORIGINS",
          "https://smart-quote-main.vercel.app,https://bridgelogis.com,https://www.bridgelogis.com"
        ).split(",").map(&:strip)
        return if allowed_origins.include?(origin)

        render json: { error: { code: "FORBIDDEN_ORIGIN", message: "Forbidden origin" } }, status: :forbidden
      end
    end
  end
end

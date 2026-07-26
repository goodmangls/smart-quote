module Api
  module V1
    class FscController < ApplicationController
      include JwtAuthenticatable

      before_action :authenticate_user!
      before_action :require_admin!, only: [:update_rates]

      # GET /api/v1/fsc/rates
      def rates
        data = FscFetcher.current_rates

        render json: {
          rates: data,
          updatedAt: FscRate.maximum(:updated_at)&.iso8601 || Time.current.iso8601
        }
      end

      # POST /api/v1/fsc/update (admin only — guarded by before_action)
      def update_rates
        carrier = params[:carrier]&.upcase

        unless %w[UPS DHL FEDEX].include?(carrier)
          return render json: { error: { code: "INVALID_CARRIER", message: "Carrier must be UPS, DHL, or FEDEX" } }, status: :unprocessable_entity
        end

        international = parse_rate(params[:international])
        domestic = parse_rate(params[:domestic])

        if international.nil? || domestic.nil?
          return render json: { error: { code: "INVALID_RATE", message: "international/domestic must be numeric between 0 and 100" } }, status: :unprocessable_entity
        end

        FscFetcher.update!(
          carrier: carrier,
          international: international,
          domestic: domestic,
          updated_by: current_user.email
        )

        AuditLog.track!(
          user: current_user,
          action: "fsc.updated",
          resource: FscRate.find_by(carrier: carrier),
          metadata: { carrier: carrier, international: international, domestic: domestic },
          ip_address: request.remote_ip
        )

        render json: { success: true, rates: FscFetcher.current_rates }
      rescue ActiveRecord::RecordInvalid, ActiveRecord::RecordNotSaved => e
        Rails.logger.error "[FSC] #{e.class}: #{e.message}"
        render json: { error: { code: "UPDATE_FAILED", message: "FSC rate update failed" } }, status: :unprocessable_entity
      end

      private

      # Accepts numeric or numeric-like string in [0, 100]. Returns Float or nil.
      # Explicit validation prevents silent `nil.to_f == 0.0` coercion that would
      # otherwise let a missing/invalid param quietly zero out a carrier's FSC.
      def parse_rate(value)
        return nil if value.nil? || value.to_s.strip.empty?
        return nil unless value.to_s.match?(/\A-?\d+(\.\d+)?\z/)

        rate = value.to_f
        return nil if rate.negative? || rate > 100
        rate
      end
    end
  end
end

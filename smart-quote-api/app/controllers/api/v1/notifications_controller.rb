module Api
  module V1
    class NotificationsController < ApplicationController
      include JwtAuthenticatable
      before_action :authenticate_user!

      DEDUPE_TTL = 1.day

      # POST /api/v1/notifications/slack
      #
      # Server-authoritative: the client sends only `referenceNo`; every word of
      # the message comes from the stored quote. Other params are ignored.
      def slack
        reference_no = params.require(:referenceNo)
        quote = current_user.quotes.find_by!(reference_no: reference_no)
        dedupe_key = "slack_notified/quote/#{quote.id}"

        if Rails.cache.exist?(dedupe_key)
          return render json: { delivered: true, duplicate: true }
        end

        SlackNotifier.deliver(quote_message(quote))
        Rails.cache.write(dedupe_key, true, expires_in: DEDUPE_TTL)
        render json: { delivered: true, duplicate: false }
      rescue SlackNotifier::NotConfigured => e
        Rails.logger.warn("[Slack] #{e.message}")
        render json: { error: { code: "SLACK_NOT_CONFIGURED", message: "Slack notifications are not configured" } },
               status: :service_unavailable
      rescue SlackNotifier::DeliveryFailed => e
        Rails.logger.error("[Slack] #{e.message}")
        render json: { error: { code: "SLACK_DELIVERY_FAILED", message: "Slack delivery failed" } },
               status: :bad_gateway
      end

      private

      def quote_message(quote)
        weight = ActiveSupport::NumberHelper.number_to_rounded(
          quote.billable_weight, precision: 2, strip_insignificant_zeros: true
        )
        krw = ActiveSupport::NumberHelper.number_to_currency(quote.total_quote_amount, unit: "₩", precision: 0)
        usd = ActiveSupport::NumberHelper.number_to_currency(quote.total_quote_amount_usd, unit: "$", precision: 2)
        margin = ActiveSupport::NumberHelper.number_to_rounded(quote.profit_margin, precision: 1)
        # 저장값도 원래는 사용자 입력이다. 모델 검증 이전에 저장된 행이 있을 수 있으므로
        # 검증에 기대지 말고 문자열 필드는 전부 이스케이프한다.
        carrier = SlackNotifier.escape(quote.overseas_carrier)
        destination = SlackNotifier.escape(quote.destination_country)

        [
          "*New member quote* `#{SlackNotifier.escape(quote.reference_no)}`",
          "Member: #{member_line}",
          "Carrier: #{carrier} → #{destination}",
          "Billable weight: #{weight} kg",
          "Total: #{krw} (#{usd})",
          "Margin: #{margin}%"
        ].join("\n")
      end

      def member_line
        email = mask_email(current_user.email)
        parts = [ current_user.company.presence, current_user.name.presence, email ].compact
        parts.map { |part| SlackNotifier.escape(part) }.join(" / ")
      end

      def mask_email(email)
        local, domain = email.to_s.split("@", 2)
        return email if local.blank? || domain.blank?

        "#{local[0]}***@#{domain}"
      end
    end
  end
end

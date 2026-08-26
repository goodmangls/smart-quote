module Api
  module V1
    class QuotesController < ApplicationController
      include JwtAuthenticatable
      include ApiKeyAuthenticatable

      InvalidInputError = Class.new(StandardError)

      # Numeric inputs the money math trusts. The frontend Zod schema bounds
      # every one of these, but the backend is what recalculates and persists,
      # so a caller that skips the frontend — a direct API call, a partner
      # integration — reached the math unchecked. Measured before the guard
      # existed, against a 292,000 baseline quote:
      #
      #   fscPercent: "abc"          → 232,100  (to_f is 0.0, so no fuel surcharge)
      #   fscPercent: 100000         → 200,105,400
      #   dutyTaxEstimate: -500,000  → -208,000 (a negative total is not a price)
      #   manualSurgeCost: -300,000  → -8,000
      #
      # nil means "not supplied" and is always allowed; the calculator has its
      # own defaults. marginPercent is deliberately absent — the calculator
      # already clamps it to 0..MAX_MARGIN_PERCENT, which bounds the money.
      # Item count is deliberately absent too: the frontend caps at 100 because
      # it is a form, but a freight partner shipping 150 packages is legitimate,
      # and the partner API is already rate limited per key.
      NUMERIC_INPUT_BOUNDS = {
        "exchangeRate" => { min: 0, exclusive_min: true, max: 10_000 },
        "fscPercent" => { min: 0, max: 200 },
        "dutyTaxEstimate" => { min: 0 },
        "manualDomesticCost" => { min: 0 },
        "manualPackingCost" => { min: 0 },
        "manualSurgeCost" => { min: 0 },
        "pickupInSeoulCost" => { min: 0 },
        "dhlDeclaredValue" => { min: 0 },
        "fedexDeclaredValue" => { min: 0 }
      }.freeze

      # Anything not matching this is rejected outright rather than coerced.
      # `"abc".to_f` and `"".to_f` are both 0.0, so a range check alone accepts
      # junk as a valid zero — which is how an empty exchangeRate slipped past
      # a `present?` guard and divided the total by zero.
      NUMERIC_INPUT_PATTERN = /\A-?\d+(\.\d+)?\z/

      # api_create is partner (machine) traffic authenticated by X-API-Key, not by
      # a user JWT — so it is excluded from authenticate_user! and gated separately.
      before_action :authenticate_user!, except: [ :calculate, :api_create ]
      before_action :authenticate_api_key!, only: [ :api_create ]

      # POST /api/v1/quotes/calculate (public - stateless)
      def calculate
        input = clean_params
        validate_quote_input!(input)
        result = QuoteCalculator.call(input)
        render json: result
      rescue InvalidInputError => e
        render json: { error: { code: "INVALID_INPUT", message: e.message } }, status: :unprocessable_content
      rescue Calculators::ZoneNotFoundError => e
        render json: { error: { code: "ZONE_NOT_FOUND", message: e.message } }, status: :unprocessable_content
      rescue StandardError => e
        Rails.logger.error "[CALCULATE] #{e.class}: #{e.message}"
        render json: { error: { code: "CALCULATION_ERROR", message: "Failed to calculate quote" } }, status: :unprocessable_content
      end

      # POST /api/v1/quotes (calculate + save)
      def create
        input = clean_params
        validate_quote_input!(input)
        result = QuoteCalculator.call(input)

        quote = current_user.quotes.new(
          **input_attributes(input),
          **result_attributes(result),
          items: input["items"] || input[:items],
          breakdown: result[:breakdown],
          warnings: result[:warnings] || [],
          notes: params[:notes],
          customer_id: params[:customerId]
        )

        if quote.save_with_reference_retry
          AuditLog.track!(user: current_user, action: "quote.created", resource: quote, ip_address: request.remote_ip)
          render json: QuoteSerializer.detail(quote), status: :created
        else
          render json: { error: { code: "VALIDATION_ERROR", message: quote.errors.full_messages.join(", ") } }, status: :unprocessable_content
        end
      rescue InvalidInputError => e
        render json: { error: { code: "INVALID_INPUT", message: e.message } }, status: :unprocessable_content
      rescue Calculators::ZoneNotFoundError => e
        render json: { error: { code: "ZONE_NOT_FOUND", message: e.message } }, status: :unprocessable_content
      rescue StandardError => e
        Rails.logger.error "[CREATE] #{e.class}: #{e.message}"
        render json: { error: { code: "CALCULATION_ERROR", message: "Failed to create quote" } }, status: :unprocessable_content
      end

      # POST /api/v1/quote_api/quotes (authenticated partner/email automation API)
      def api_create
        input = normalize_quote_api_params
        validate_quote_input!(input)
        result = QuoteCalculator.call(input)

        quote = current_api_key.quotes.new(
          **input_attributes(input),
          **result_attributes(result),
          items: input["items"],
          breakdown: result[:breakdown],
          warnings: result[:warnings] || [],
          notes: quote_api_notes
        )

        if quote.save_with_reference_retry
          AuditLog.track!(
            user: nil,
            action: "quote.api_created",
            resource: quote,
            metadata: PartnerQuoteResponse.audit_metadata(api_params: quote_api_params, api_key: current_api_key),
            ip_address: request.remote_ip
          )
          render json: PartnerQuoteResponse.body(quote: quote, result: result, api_params: quote_api_params, api_key: current_api_key),
                 status: :created
        else
          render json: { error: { code: "VALIDATION_ERROR", message: quote.errors.full_messages.join(", ") } }, status: :unprocessable_content
        end
      rescue InvalidInputError => e
        render json: { error: { code: "INVALID_INPUT", message: e.message } }, status: :unprocessable_content
      rescue Calculators::ZoneNotFoundError => e
        render json: { error: { code: "ZONE_NOT_FOUND", message: e.message } }, status: :unprocessable_content
      rescue StandardError => e
        Rails.logger.error "[QUOTE_API_CREATE] #{e.class}: #{e.message}"
        render json: { error: { code: "CALCULATION_ERROR", message: "Failed to create API quote" } }, status: :unprocessable_content
      end

      # Auto-expiration batch bound: one giant backlog must not stall a listing
      # request; the remainder expires on subsequent requests.
      STALE_EXPIRE_BATCH = 500

      # GET /api/v1/quotes
      def index
        expire_stale_drafts!

        quotes = QuoteSearcher.call(scoped_quotes, params)
                      .page(params[:page] || 1)
                      .per([ (params[:per_page] || 20).to_i, 100 ].min)

        render json: {
          quotes: quotes.map { |q| QuoteSerializer.summary(q) },
          pagination: {
            currentPage: quotes.current_page,
            totalPages: quotes.total_pages,
            totalCount: quotes.total_count,
            perPage: quotes.limit_value
          }
        }
      end

      # GET /api/v1/quotes/:id
      def show
        quote = scoped_quotes.find(params[:id])
        render json: QuoteSerializer.detail(quote)
      rescue ActiveRecord::RecordNotFound
        render json: { error: { code: "NOT_FOUND", message: "Quote not found" } }, status: :not_found
      end

      # PATCH /api/v1/quotes/:id (status update only)
      def update
        quote = scoped_quotes.find(params[:id])
        permitted = params.permit(:status, :notes, :customer_id)

        if permitted[:status].present?
          unless Quote::VALID_STATUSES.include?(permitted[:status])
            return render json: { error: { code: "INVALID_STATUS", message: "Invalid status" } }, status: :unprocessable_content
          end
        end

        old_status = quote.status
        if quote.update(permitted.to_h.transform_keys { |k| k.to_s.underscore })
          metadata = {}
          metadata[:status_from] = old_status if permitted[:status].present? && old_status != quote.status
          metadata[:status_to] = quote.status if metadata[:status_from]
          action = metadata[:status_from] ? "quote.status_changed" : "quote.updated"
          AuditLog.track!(user: current_user, action: action, resource: quote, metadata: metadata, ip_address: request.remote_ip)
          render json: QuoteSerializer.detail(quote)
        else
          render json: { error: { code: "VALIDATION_ERROR", message: quote.errors.full_messages.join(", ") } }, status: :unprocessable_content
        end
      rescue ActiveRecord::RecordNotFound
        render json: { error: { code: "NOT_FOUND", message: "Quote not found" } }, status: :not_found
      end

      # POST /api/v1/quotes/:id/send_email
      def send_email
        quote = scoped_quotes.find(params[:id])
        email = params[:recipientEmail]
        name = params[:recipientName] || "Customer"
        message = params[:message]

        valid_email_regex = /\A[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+\z/
        unless email.present? && email.match?(valid_email_regex)
          return render json: { error: { code: "INVALID_EMAIL", message: "Valid email required" } }, status: :unprocessable_content
        end

        QuoteMailer.send_quote(quote, email, recipient_name: name, message: message).deliver_later
        quote.update(status: "sent") if quote.status == "draft"

        AuditLog.track!(user: current_user, action: "quote.email_sent", resource: quote, metadata: { recipient: email }, ip_address: request.remote_ip)
        render json: { success: true, message: "Quote sent to #{email}" }
      rescue ActiveRecord::RecordNotFound
        render json: { error: { code: "NOT_FOUND", message: "Quote not found" } }, status: :not_found
      end

      # DELETE /api/v1/quotes/:id
      def destroy
        quote = scoped_quotes.find(params[:id])
        AuditLog.track!(user: current_user, action: "quote.deleted", resource: quote, metadata: { reference_no: quote.reference_no }, ip_address: request.remote_ip)
        quote.destroy
        head :no_content
      rescue ActiveRecord::RecordNotFound
        render json: { error: { code: "NOT_FOUND", message: "Quote not found" } }, status: :not_found
      end

      # GET /api/v1/quotes/export(.csv|.xlsx)
      def export
        export_filters = params.permit(
          :q, :destination_country, :date_from, :date_to, :status,
          :min_amount, :max_amount, :amount_currency
        ).to_h
        filtered_scope = QuoteSearcher.call(scoped_quotes, export_filters)
        format = request.format.symbol == :xlsx ? :xlsx : :csv
        result = QuoteExporter.call(filtered_scope, format: format)

        AuditLog.track!(
          user: current_user,
          action: "quote.exported",
          resource: Quote.new(id: 0),
          metadata: { count: result[:count], format: format, filters: export_filters },
          ip_address: request.remote_ip
        )

        if format == :xlsx
          send_data result[:xlsx_data],
            filename: "quotes-#{Date.current}.xlsx",
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        else
          send_data result[:csv_data], filename: "quotes-#{Date.current}.csv", type: "text/csv"
        end
      rescue QuoteSearcher::InvalidRangeError => e
        render json: { error: { code: "INVALID_AMOUNT_RANGE", message: e.message } }, status: :unprocessable_content
      rescue QuoteExporter::TooLargeError => e
        render json: { error: { code: "EXPORT_TOO_LARGE", message: e.message } }, status: :unprocessable_content
      end

      private

      # Draft/sent quotes past validity expire on read, but the transition is a
      # status change like any other — it must leave an audit trail
      # (quote.auto_expired). Best-effort: a failure here never breaks listing.
      def expire_stale_drafts!
        stale = scoped_quotes.stale_drafts.limit(STALE_EXPIRE_BATCH).pluck(:id, :reference_no, :status)
        return if stale.empty?

        now = Time.current
        Quote.where(id: stale.map(&:first)).update_all(status: "expired", updated_at: now)
        AuditLog.insert_all(
          stale.map do |id, reference_no, status_from|
            {
              action: "quote.auto_expired",
              resource_type: "Quote",
              resource_id: id,
              resource_ref: reference_no,
              metadata: { status_from: status_from, status_to: "expired" },
              created_at: now,
              updated_at: now
            }
          end
        )
      rescue StandardError => e
        Rails.logger.error "[QUOTES] stale draft expiration failed: #{e.class}: #{e.message}"
      end

      def scoped_quotes
        if current_user.role == "admin"
          Quote.includes(:customer, :user).recent
        else
          current_user.quotes.includes(:customer, :user).recent
        end
      end

      # Field mapping lives in PartnerQuoteInput. Margin stays here because it
      # depends on the authenticated API key: a partner must never be able to set
      # its own margin, so resolving it at the call site keeps that rule visible.
      def normalize_quote_api_params
        builder = PartnerQuoteInput.new(quote_api_params)
        builder.to_h(margin_percent: resolved_partner_margin(builder.packages))
      rescue PartnerQuoteInput::InvalidInput => e
        raise InvalidInputError, e.message
      end

      def quote_api_params
        # margin_percent is intentionally NOT permitted — margin is resolved
        # server-side in resolved_partner_margin. Permitting it here would let a
        # partner price its own shipment and back out our cost basis.
        params.permit(
          :service_type, :carrier, :currency, :exchange_rate,
          :fsc_percent, :manual_surcharge_cost,
          origin: [ :country, :city, :postal_code, :address, :location_note,
                    :domestic_region_code, :is_jeju_pickup ],
          destination: [ :country, :airport, :city, :postal_code, :address ],
          cargo: [ :packing_type, :manual_packing_cost,
                   { packages: [ :id, :name, :quantity, :length_cm, :width_cm,
                                 :height_cm, :gross_weight_kg ] } ],
          terms: [ :incoterms, :pickup_required, :pickup_cost,
                   :customs_clearance_required, :duty_tax_estimate ],
          requested_by: [ :company, :contact, :email ]
        ).to_h
      end

      def quote_api_notes
        requester = quote_api_params["requested_by"] || {}
        [
          "BridgeLogis Quote API v1",
          requester["company"].presence && "Company: #{requester['company']}",
          requester["contact"].presence && "Contact: #{requester['contact']}",
          requester["email"].presence && "Email: #{requester['email']}"
        ].compact.join("\n")
      end

      # Server-side margin for partner traffic.
      #
      # Resolved from margin_rules against the API key's margin_identity, so the
      # rate is visible and editable in the admin Margin Rules UI. Falls back to
      # MarginRuleResolver::DEFAULT_MARGIN when the key has no matching rule.
      #
      # Banded rules need a weight before QuoteCalculator has run, so we band on
      # declared gross weight rather than chargeable weight.
      def resolved_partner_margin(packages)
        MarginRuleResolver.resolve(
          email: current_api_key&.margin_identity,
          nationality: current_api_key&.nationality,
          weight: PartnerQuoteResponse.gross_weight(packages)
        )[:margin_percent].to_f
      end

      def validate_quote_input!(input)
        destination = input["destinationCountry"] || input[:destinationCountry]
        raise InvalidInputError, "destinationCountry is required" if destination.blank?

        validate_numeric_bounds!(input)

        items = input["items"] || input[:items] || []
        items.each_with_index do |item, idx|
          quantity = item["quantity"] || item[:quantity] || 1
          unless quantity.to_i > 0
            raise InvalidInputError, "Item #{idx + 1}: quantity must be greater than 0"
          end

          weight = item["weight"] || item[:weight]
          unless weight.present? && weight.to_f > 0
            raise InvalidInputError, "Item #{idx + 1}: weight must be greater than 0"
          end
        end
      end

      def validate_numeric_bounds!(input)
        NUMERIC_INPUT_BOUNDS.each do |key, bounds|
          raw = input[key] || input[key.to_sym]
          next if raw.nil?

          unless raw.is_a?(Numeric) || raw.to_s.match?(NUMERIC_INPUT_PATTERN)
            raise InvalidInputError, "#{key} must be a number"
          end

          value = raw.to_f
          min = bounds[:min]

          if bounds[:exclusive_min] ? value <= min : value < min
            floor = bounds[:exclusive_min] ? "greater than #{min}" : "at least #{min}"
            raise InvalidInputError, "#{key} must be #{floor}"
          end

          if bounds[:max] && value > bounds[:max]
            raise InvalidInputError, "#{key} must be at most #{bounds[:max]}"
          end
        end
      end

      def clean_params
        params.permit(
          :originCountry, :destinationCountry, :destinationZip,
          :domesticRegionCode, :isJejuPickup,
          :incoterm, :packingType, :shippingItemType, :shippingMode,
          :marginPercent, :dutyTaxEstimate,
          :exchangeRate, :fscPercent,
          :manualDomesticCost, :manualPackingCost, :manualSurgeCost,
          :overseasCarrier, :customerId, :pickupInSeoulCost,
          :dhlDeclaredValue, :fedexDeclaredValue,
          dhlAddOns: [],
          upsAddOns: [],
          fedexAddOns: [],
          items: [ :id, :name, :quantity, :weight, :length, :width, :height ],
          resolvedAddonRates: [ :code, :carrier, :nameEn, :nameKo, :chargeType,
                                :unit, :amount, :perKgRate, :ratePercent, :minAmount,
                                :fscApplicable, :autoDetect, :selectable, :condition,
                                detectRules: {} ],
          resolvedSurcharges: [ :code, :name, :nameKo, :chargeType, :amount, :sourceUrl ]
        ).to_h
      end

      # Field mapping and defaults live in QuoteInputAttributes.
      def input_attributes(input)
        QuoteInputAttributes.call(input)
      end

      def result_attributes(result)
        {
          total_quote_amount: result[:totalQuoteAmount],
          total_quote_amount_usd: result[:totalQuoteAmountUSD],
          total_cost_amount: result[:totalCostAmount],
          profit_amount: result[:profitAmount],
          profit_margin: result[:profitMargin],
          billable_weight: result[:billableWeight],
          applied_zone: result[:appliedZone],
          domestic_truck_type: result[:domesticTruckType],
          carrier: result[:carrier],
          transit_time: result[:transitTime]
        }
      end
    end
  end
end

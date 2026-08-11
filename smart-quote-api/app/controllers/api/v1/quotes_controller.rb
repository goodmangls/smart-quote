module Api
  module V1
    class QuotesController < ApplicationController
      include JwtAuthenticatable
      include ApiKeyAuthenticatable

      InvalidInputError = Class.new(StandardError)

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
        render json: { error: { code: "INVALID_INPUT", message: e.message } }, status: :unprocessable_entity
      rescue StandardError => e
        Rails.logger.error "[CALCULATE] #{e.class}: #{e.message}"
        render json: { error: { code: "CALCULATION_ERROR", message: "Failed to calculate quote" } }, status: :unprocessable_entity
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

        if quote.save
          AuditLog.track!(user: current_user, action: "quote.created", resource: quote, ip_address: request.remote_ip)
          render json: QuoteSerializer.detail(quote), status: :created
        else
          render json: { error: { code: "VALIDATION_ERROR", message: quote.errors.full_messages.join(", ") } }, status: :unprocessable_entity
        end
      rescue InvalidInputError => e
        render json: { error: { code: "INVALID_INPUT", message: e.message } }, status: :unprocessable_entity
      rescue StandardError => e
        Rails.logger.error "[CREATE] #{e.class}: #{e.message}"
        render json: { error: { code: "CALCULATION_ERROR", message: "Failed to create quote" } }, status: :unprocessable_entity
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

        if quote.save
          AuditLog.track!(
            user: nil,
            action: "quote.api_created",
            resource: quote,
            metadata: quote_api_audit_metadata,
            ip_address: request.remote_ip
          )
          render json: quote_api_response(quote, result, input), status: :created
        else
          render json: { error: { code: "VALIDATION_ERROR", message: quote.errors.full_messages.join(", ") } }, status: :unprocessable_entity
        end
      rescue InvalidInputError => e
        render json: { error: { code: "INVALID_INPUT", message: e.message } }, status: :unprocessable_entity
      rescue StandardError => e
        Rails.logger.error "[QUOTE_API_CREATE] #{e.class}: #{e.message}"
        render json: { error: { code: "CALCULATION_ERROR", message: "Failed to create API quote" } }, status: :unprocessable_entity
      end

      # GET /api/v1/quotes
      def index
        # Auto-expire stale drafts (validity_date passed)
        scoped_quotes.stale_drafts.update_all(status: "expired")

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
            return render json: { error: { code: "INVALID_STATUS", message: "Invalid status" } }, status: :unprocessable_entity
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
          render json: { error: { code: "VALIDATION_ERROR", message: quote.errors.full_messages.join(", ") } }, status: :unprocessable_entity
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
          return render json: { error: { code: "INVALID_EMAIL", message: "Valid email required" } }, status: :unprocessable_entity
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
        render json: { error: { code: "INVALID_AMOUNT_RANGE", message: e.message } }, status: :unprocessable_entity
      rescue QuoteExporter::TooLargeError => e
        render json: { error: { code: "EXPORT_TOO_LARGE", message: e.message } }, status: :unprocessable_entity
      end

      private

      def scoped_quotes
        if current_user.role == "admin"
          Quote.includes(:customer, :user).recent
        else
          current_user.quotes.includes(:customer, :user).recent
        end
      end

      def normalize_quote_api_params
        api = quote_api_params
        packages = api.dig("cargo", "packages") || []
        raise InvalidInputError, "cargo.packages is required" if packages.blank?

        carrier = (api["carrier"].presence || "UPS").upcase
        fsc_rates = FscFetcher.current_rates
        fsc_percent = api["fsc_percent"].presence ||
                      fsc_rates.dig(carrier, "international") ||
                      (carrier == "DHL" ? Constants::Rates::DEFAULT_FSC_PERCENT_DHL : Constants::Rates::DEFAULT_FSC_PERCENT)

        {
          "originCountry" => api.dig("origin", "country").presence || "KR",
          "destinationCountry" => api.dig("destination", "country"),
          "destinationZip" => api.dig("destination", "postal_code") || api.dig("destination", "airport"),
          "domesticRegionCode" => api.dig("origin", "domestic_region_code").presence || "A",
          "isJejuPickup" => ActiveModel::Type::Boolean.new.cast(api.dig("origin", "is_jeju_pickup")),
          "incoterm" => api.dig("terms", "incoterms").presence || "DAP",
          "packingType" => api.dig("cargo", "packing_type").presence || "NONE",
          "shippingMode" => api["service_type"].presence || "express_courier",
          # Margin is resolved from margin_rules against the API key's identity —
          # never from the payload. A partner that could set its own margin could
          # set it to 0 and read our cost basis straight off the response.
          "marginPercent" => resolved_partner_margin(packages),
          "dutyTaxEstimate" => (api.dig("terms", "duty_tax_estimate") || 0).to_f,
          "exchangeRate" => (api["exchange_rate"].presence || Constants::Rates::DEFAULT_EXCHANGE_RATE).to_f,
          "fscPercent" => fsc_percent.to_f,
          "manualDomesticCost" => api.dig("terms", "pickup_required") ? (api.dig("terms", "pickup_cost") || 0).to_f : 0,
          "manualPackingCost" => api.dig("cargo", "manual_packing_cost"),
          "manualSurgeCost" => (api["manual_surcharge_cost"] || 0).to_f,
          "overseasCarrier" => carrier,
          "items" => packages.map.with_index(1) { |package, idx| normalize_quote_api_package(package, idx) }
        }
      end

      def normalize_quote_api_package(package, idx)
        {
          "id" => package["id"].presence || "api-package-#{idx}",
          "name" => package["name"].presence || "Package #{idx}",
          "quantity" => (package["quantity"].presence || 1).to_i,
          "weight" => package["gross_weight_kg"].to_f,
          "length" => package["length_cm"].to_f,
          "width" => package["width_cm"].to_f,
          "height" => package["height_cm"].to_f
        }
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
          weight: quote_api_gross_weight(packages)
        )[:margin_percent].to_f
      end

      def quote_api_audit_metadata
        api = quote_api_params
        {
          source: "quote_api_v1",
          partner_api_key_id: current_api_key&.id,
          partner_name: current_api_key&.name,
          requested_by: api["requested_by"],
          service_type: api["service_type"],
          carrier: api["carrier"]
        }
      end

      def quote_api_response(quote, result, input)
        api = quote_api_params
        packages = api.dig("cargo", "packages") || []
        {
          quote_id: quote.reference_no,
          status: "quoted",
          service: {
            provider: "BridgeLogis",
            service_name: "BridgeLogis Express Courier",
            carrier: quote.carrier || quote.overseas_carrier
          },
          route: {
            origin_country: quote.origin_country,
            origin_city: api.dig("origin", "city"),
            destination_country: quote.destination_country,
            destination_city: api.dig("destination", "city"),
            destination_airport: api.dig("destination", "airport")
          },
          cargo_summary: {
            packages: packages.sum { |p| p["quantity"].to_i },
            gross_weight_kg: quote_api_gross_weight(packages),
            volume_weight_kg: quote_api_volume_weight(packages),
            chargeable_weight_kg: result[:billableWeight].to_f
          },
          pricing: {
            currency: "USD",
            total: result[:totalQuoteAmountUSD].to_f.round(2)
          },
          transit_time: {
            value: result[:transitTime],
            unit: "business_days"
          },
          conditions: [
            "Subject to final pickup availability.",
            "Subject to customs requirements and commodity acceptance.",
            "Subject to final carrier confirmation at booking."
          ],
          valid_until: quote.validity_date&.iso8601,
          created_at: quote.created_at.iso8601
        }
      end

      def quote_api_gross_weight(packages)
        packages.sum { |p| p["quantity"].to_i * p["gross_weight_kg"].to_f }.round(2)
      end

      def quote_api_volume_weight(packages)
        packages.sum { |p| p["quantity"].to_i * p["length_cm"].to_f * p["width_cm"].to_f * p["height_cm"].to_f / 5000.0 }.ceil.to_f
      end

      def validate_quote_input!(input)
        destination = input["destinationCountry"] || input[:destinationCountry]
        raise InvalidInputError, "destinationCountry is required" if destination.blank?

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

      def clean_params
        params.permit(
          :originCountry, :destinationCountry, :destinationZip,
          :domesticRegionCode, :isJejuPickup,
          :incoterm, :packingType, :shippingItemType, :shippingMode,
          :marginPercent, :dutyTaxEstimate,
          :exchangeRate, :fscPercent,
          :manualDomesticCost, :manualPackingCost, :manualSurgeCost,
          :overseasCarrier, :customerId, :pickupInSeoulCost,
          :dhlDeclaredValue,
          dhlAddOns: [],
          upsAddOns: [],
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

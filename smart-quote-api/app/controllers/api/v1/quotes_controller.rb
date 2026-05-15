module Api
  module V1
    class QuotesController < ApplicationController
      include JwtAuthenticatable

      InvalidInputError = Class.new(StandardError)

      before_action :authenticate_user!, except: [ :calculate ]

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

      def validate_quote_input!(input)
        destination = input["destinationCountry"] || input[:destinationCountry]
        raise InvalidInputError, "destinationCountry is required" if destination.blank?

        items = input["items"] || input[:items] || []
        items.each_with_index do |item, idx|
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
          :incoterm, :packingType, :shippingMode,
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

      def input_attributes(input)
        {
          origin_country: input["originCountry"] || input[:originCountry] || "KR",
          destination_country: input["destinationCountry"] || input[:destinationCountry],
          destination_zip: input["destinationZip"] || input[:destinationZip],
          domestic_region_code: input["domesticRegionCode"] || input[:domesticRegionCode] || "A",
          is_jeju_pickup: input["isJejuPickup"] || input[:isJejuPickup] || false,
          incoterm: input["incoterm"] || input[:incoterm],
          packing_type: input["packingType"] || input[:packingType] || "NONE",
          margin_percent: input["marginPercent"] || input[:marginPercent] || 15,
          duty_tax_estimate: input["dutyTaxEstimate"] || input[:dutyTaxEstimate] || 0,
          exchange_rate: input["exchangeRate"] || input[:exchangeRate],
          fsc_percent: input["fscPercent"] || input[:fscPercent],
          manual_domestic_cost: input["manualDomesticCost"] || input[:manualDomesticCost],
          manual_packing_cost: input["manualPackingCost"] || input[:manualPackingCost],
          manual_surge_cost: input["manualSurgeCost"] || input[:manualSurgeCost] || 0,
          pickup_in_seoul_cost: input["pickupInSeoulCost"] || input[:pickupInSeoulCost] || 0,
          overseas_carrier: input["overseasCarrier"] || input[:overseasCarrier] || "UPS"
        }
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

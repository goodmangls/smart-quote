module Api
  module V1
    class MarginRulesController < ApplicationController
      include JwtAuthenticatable

      before_action :authenticate_user!
      before_action :require_admin!, except: [ :resolve ]
      before_action :set_margin_rule, only: [ :update, :destroy ]
      before_action :validate_resolve_params!, only: [ :resolve ]
      before_action :authorize_resolve_target!, only: [ :resolve ]

      # GET /api/v1/margin_rules
      def index
        rules = MarginRule.by_priority
        render json: { rules: rules.map { |r| serialize_rule(r) } }
      end

      # POST /api/v1/margin_rules
      def create
        rule = MarginRule.new(margin_rule_params)
        rule.created_by = current_user.email

        if rule.save
          invalidate_cache!
          audit_log!("margin_rule.created", rule)
          render json: serialize_rule(rule), status: :created
        else
          render json: { error: { code: "VALIDATION_ERROR", messages: rule.errors.full_messages } },
                 status: :unprocessable_entity
        end
      end

      # PUT /api/v1/margin_rules/:id
      def update
        if @margin_rule.update(margin_rule_params)
          invalidate_cache!
          audit_log!("margin_rule.updated", @margin_rule)
          render json: serialize_rule(@margin_rule)
        else
          render json: { error: { code: "VALIDATION_ERROR", messages: @margin_rule.errors.full_messages } },
                 status: :unprocessable_entity
        end
      end

      # DELETE /api/v1/margin_rules/:id (soft delete)
      def destroy
        @margin_rule.update!(is_active: false)
        invalidate_cache!
        audit_log!("margin_rule.deleted", @margin_rule)
        render json: { success: true }
      end

      # GET /api/v1/margin_rules/resolve
      def resolve
        result = MarginRuleResolver.resolve(
          email: params[:email],
          nationality: params[:nationality],
          weight: params[:weight].to_f
        )

        render json: {
          marginPercent: result[:margin_percent],
          matchedRule: result[:matched_rule] ? { id: result[:matched_rule].id, name: result[:matched_rule].name } : nil,
          fallback: result[:fallback]
        }
      end

      private

      def set_margin_rule
        @margin_rule = MarginRule.find(params[:id])
      end

      def margin_rule_params
        params.permit(:name, :rule_type, :priority, :match_email,
                       :match_nationality, :weight_min, :weight_max,
                       :margin_percent, :is_active)
      end

      # Margin/pricing is internal: a non-admin may only resolve their own email.
      # Prevents members enumerating competitors' or other accounts' margin.
      def authorize_resolve_target!
        return if current_user.role == "admin"

        requested = params[:email].to_s.downcase.strip
        own = current_user.email.to_s.downcase.strip
        return if requested == own

        render json: { error: { code: "FORBIDDEN", message: "You can only resolve margin for your own account." } },
               status: :forbidden
      end

      def validate_resolve_params!
        unless params[:email].present?
          render json: { error: { code: "VALIDATION_ERROR", message: "email is required" } },
                 status: :unprocessable_entity and return
        end

        weight = params[:weight]
        unless weight.present? && weight.to_s.match?(/\A\d+(\.\d+)?\z/) && weight.to_f > 0
          render json: { error: { code: "VALIDATION_ERROR", message: "weight must be a positive number" } },
                 status: :unprocessable_entity and return
        end
      end

      def invalidate_cache!
        Rails.cache.delete(MarginRuleResolver::CACHE_KEY)
      end

      def audit_log!(action, rule)
        AuditLog.track!(
          user: current_user,
          action: action,
          resource: rule,
          metadata: { name: rule.name, margin_percent: rule.margin_percent.to_f },
          ip_address: request.remote_ip
        )
      end

      def serialize_rule(rule)
        {
          id: rule.id,
          name: rule.name,
          ruleType: rule.rule_type,
          priority: rule.priority,
          matchEmail: rule.match_email,
          matchNationality: rule.match_nationality,
          weightMin: rule.weight_min&.to_f,
          weightMax: rule.weight_max&.to_f,
          marginPercent: rule.margin_percent.to_f,
          isActive: rule.is_active,
          createdBy: rule.created_by,
          createdAt: rule.created_at.iso8601,
          updatedAt: rule.updated_at.iso8601
        }
      end
    end
  end
end

class QuoteSearcher
  InvalidRangeError = Class.new(ArgumentError)

  def self.call(scope, params)
    new(scope, params).call
  end

  def initialize(scope, params)
    @scope = scope
    @params = params.respond_to?(:with_indifferent_access) ? params.with_indifferent_access : params
  end

  def call
    validate_amount_range!
    @scope
      .includes(:customer)
      .search_text(@params[:q])
      .by_destination(@params[:destination_country])
      .by_date_range(@params[:date_from], @params[:date_to])
      .by_status(@params[:status])
      .by_amount_range(min: parsed_min, max: parsed_max, currency: amount_currency)
  end

  private

  def parsed_min
    val = @params[:min_amount]
    val.present? ? val.to_d : nil
  end

  def parsed_max
    val = @params[:max_amount]
    val.present? ? val.to_d : nil
  end

  def amount_currency
    @params[:amount_currency].to_s.upcase == "USD" ? "USD" : "KRW"
  end

  def validate_amount_range!
    return unless parsed_min && parsed_max
    return if parsed_min <= parsed_max

    raise InvalidRangeError, "amount range invalid: min_amount must be <= max_amount"
  end
end

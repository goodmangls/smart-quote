require "csv"

class QuoteExporter
  MAX_EXPORT_COUNT = 10_000

  HEADERS = [
    "Reference No", "Date", "Destination", "Incoterm", "Billable Weight (kg)",
    "Total Cost (KRW)", "Quote Amount (KRW)", "Quote Amount (USD)", "Margin %", "Status"
  ].freeze

  def self.call(scope, format: :csv)
    new(scope, format: format).call
  end

  def initialize(scope, format: :csv)
    @scope = scope
    @format = format
  end

  # Returns:
  #   { csv_data:, count: }   when format == :csv
  #   { xlsx_data:, count: }  when format == :xlsx
  # Raises TooLargeError when count > MAX_EXPORT_COUNT
  def call
    count = @scope.count

    if count > MAX_EXPORT_COUNT
      raise TooLargeError, "Too many records (max #{MAX_EXPORT_COUNT}). Please narrow your filters."
    end

    case @format
    when :xlsx
      { xlsx_data: generate_xlsx, count: count }
    else
      { csv_data: generate_csv, count: count }
    end
  end

  class TooLargeError < StandardError; end

  private

  def generate_csv
    CSV.generate(headers: true) do |csv|
      csv << HEADERS
      @scope.find_each { |q| csv << build_row(q) }
    end
  end

  def generate_xlsx
    package = Axlsx::Package.new
    package.workbook.add_worksheet(name: "Quotes") do |sheet|
      sheet.add_row HEADERS
      @scope.find_each { |q| sheet.add_row build_row(q) }
    end
    package.to_stream.read
  end

  def build_row(q)
    [
      q.reference_no,
      q.created_at.strftime("%Y-%m-%d"),
      q.destination_country,
      q.incoterm,
      q.billable_weight.to_f,
      q.total_cost_amount.to_i,
      q.total_quote_amount.to_i,
      q.total_quote_amount_usd.to_f.round(2),
      q.profit_margin.to_f,
      q.status
    ]
  end
end

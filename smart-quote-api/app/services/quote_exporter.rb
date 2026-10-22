require "csv"

class QuoteExporter
  MAX_EXPORT_COUNT = 10_000

  # [header, value, margin data?]. Cost and margin are admin-only — the same
  # rule as QuoteSerializer, and for the same reason: either column against the
  # quote amount gives the margin away.
  COLUMNS = [
    [ "Reference No",         ->(q) { q.reference_no },                          false ],
    [ "Date",                 ->(q) { q.created_at.strftime("%Y-%m-%d") },       false ],
    [ "Destination",          ->(q) { q.destination_country },                   false ],
    [ "Incoterm",             ->(q) { q.incoterm },                              false ],
    [ "Billable Weight (kg)", ->(q) { q.billable_weight.to_f },                  false ],
    [ "Total Cost (KRW)",     ->(q) { q.total_cost_amount.to_i },                true ],
    [ "Quote Amount (KRW)",   ->(q) { q.total_quote_amount.to_i },               false ],
    [ "Quote Amount (USD)",   ->(q) { q.total_quote_amount_usd.to_f.round(2) },  false ],
    [ "Margin %",             ->(q) { q.profit_margin.to_f },                    true ],
    [ "Status",               ->(q) { q.status },                                false ]
  ].freeze

  # Deny by default: a call site that forgets the flag gets the member file.
  def self.call(scope, format: :csv, include_margin: false)
    new(scope, format: format, include_margin: include_margin).call
  end

  def initialize(scope, format: :csv, include_margin: false)
    @scope = scope
    @format = format
    @columns = include_margin ? COLUMNS : COLUMNS.reject { |(_, _, margin)| margin }
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
      csv << headers
      @scope.find_each { |q| csv << build_row(q) }
    end
  end

  def generate_xlsx
    package = Axlsx::Package.new
    package.workbook.add_worksheet(name: "Quotes") do |sheet|
      sheet.add_row headers
      @scope.find_each { |q| sheet.add_row build_row(q) }
    end
    package.to_stream.read
  end

  def headers
    @columns.map(&:first)
  end

  def build_row(q)
    @columns.map { |(_, value, _)| value.call(q) }
  end
end

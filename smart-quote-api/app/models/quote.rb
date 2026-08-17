class Quote < ApplicationRecord
  belongs_to :user, optional: true
  belongs_to :customer, optional: true
  # Set instead of user_id for quotes created through the partner quote API.
  belongs_to :partner_api_key, optional: true

  VALID_INCOTERMS = %w[EXW FOB C&F CIF DAP DDP].freeze
  VALID_PACKING_TYPES = %w[NONE WOODEN_BOX SKID VACUUM].freeze
  VALID_SHIPPING_ITEM_TYPES = %w[NON_DOCUMENT DOCUMENT].freeze
  VALID_STATUSES = %w[draft sent accepted rejected confirmed expired].freeze
  DEFAULT_VALIDITY_DAYS = 7

  validates :reference_no, presence: true, uniqueness: true
  validates :destination_country, presence: true, length: { maximum: 3 }
  validates :incoterm, presence: true, inclusion: { in: VALID_INCOTERMS }
  validates :packing_type, presence: true, inclusion: { in: VALID_PACKING_TYPES }
  validates :shipping_item_type, presence: true, inclusion: { in: VALID_SHIPPING_ITEM_TYPES }
  validates :margin_percent, presence: true, numericality: { greater_than_or_equal_to: 0 }
  validates :total_quote_amount, presence: true
  validates :total_cost_amount, presence: true
  validates :items, presence: true
  validates :breakdown, presence: true
  validates :status, inclusion: { in: VALID_STATUSES }

  scope :recent, -> { order(created_at: :desc) }
  scope :stale_drafts, -> {
    where(status: %w[draft sent])
      .where("validity_date < ?", Date.current)
  }
  scope :by_destination, ->(country) { where(destination_country: country) if country.present? }
  scope :by_status, ->(status) { where(status: status) if status.present? }
  scope :by_date_range, ->(from, to) {
    scope = all
    if from.present?
      parsed_from = Date.parse(from.to_s) rescue nil
      scope = scope.where("created_at >= ?", parsed_from) if parsed_from
    end
    if to.present?
      parsed_to = Date.parse(to.to_s) rescue nil
      scope = scope.where("created_at <= ?", parsed_to.end_of_day) if parsed_to
    end
    scope
  }
  scope :search_text, ->(q) {
    where("reference_no ILIKE :q OR destination_country ILIKE :q", q: "%#{sanitize_sql_like(q)}%") if q.present?
  }
  scope :by_amount_range, ->(min:, max:, currency:) {
    column = currency == "USD" ? :total_quote_amount_usd : :total_quote_amount
    s = all
    s = s.where("#{column} >= ?", min) if min.present?
    s = s.where("#{column} <= ?", max) if max.present?
    s
  }

  before_validation :generate_reference_no, on: :create
  # Model-level default: the production quotes table was found without the
  # column default (2026-08-17) and every save failed validation on a nil
  # status — never depend on the DB schema for this.
  before_validation ->(quote) { quote.status ||= "draft" }, on: :create
  before_create :set_validity_date

  def expired?
    validity_date.present? && validity_date < Date.current && %w[draft sent].include?(status)
  end

  # Concurrent creates can compute the same next sequence before either row
  # is inserted; the unique index then rejects the second INSERT. Clearing
  # reference_no lets the before_validation callback pick a fresh number.
  def save_with_reference_retry(max_retries: 3)
    attempts = 0
    begin
      save
    rescue ActiveRecord::RecordNotUnique => e
      raise unless e.message.include?("reference_no")

      attempts += 1
      raise if attempts > max_retries

      self.reference_no = nil
      retry
    end
  end

  private

  def set_validity_date
    self.validity_date ||= (created_at || Time.current).to_date + DEFAULT_VALIDITY_DAYS
  end

  # Numeric MAX over the sequence part — lexicographic ordering breaks past
  # 9999 ("SQ-2026-10000" sorts before "SQ-2026-9999"), which would repeat
  # and permanently collide on the same number.
  def generate_reference_no
    return if reference_no.present?

    year = Time.current.year
    max_seq = self.class
      .where("reference_no ~ ?", "^SQ-#{year}-\\d+$")
      .maximum(Arel.sql("CAST(SPLIT_PART(reference_no, '-', 3) AS INTEGER)"))
      .to_i
    self.reference_no = format("SQ-%d-%04d", year, max_seq + 1)
  end
end

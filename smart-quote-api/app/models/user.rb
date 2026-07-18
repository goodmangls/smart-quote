class User < ApplicationRecord
  has_secure_password

  has_many :quotes, dependent: :nullify
  has_many :customers, dependent: :nullify

  validates :email, presence: true,
                    uniqueness: { case_sensitive: false },
                    format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :role, presence: true, inclusion: { in: %w[admin user member] }
  validate :networks_must_be_valid

  VALID_NETWORKS = %w[WCA MPL EAN JCtrans].freeze
  MAGIC_LINK_TTL = 15.minutes

  after_initialize :set_default_role, if: :new_record?
  validates :password, length: { minimum: 6 }, if: :password_required?

  before_save :downcase_email

  def generate_magic_link_token!
    raw = SecureRandom.urlsafe_base64(32)
    self.magic_link_token_digest = Digest::SHA256.hexdigest(raw)
    self.magic_link_token_expires_at = MAGIC_LINK_TTL.from_now
    save!
    raw
  end

  def magic_link_valid?(token)
    return false if magic_link_token_digest.blank?
    return false if magic_link_token_expires_at.blank?
    return false if magic_link_token_expires_at <= Time.current

    expected = magic_link_token_digest
    actual   = Digest::SHA256.hexdigest(token.to_s)
    ActiveSupport::SecurityUtils.secure_compare(expected, actual)
  end

  def consume_magic_link_token!
    update!(
      magic_link_token_digest: nil,
      magic_link_token_expires_at: nil,
    )
  end

  private

  def set_default_role
    self.role ||= "user"
  end

  def downcase_email
    self.email = email.downcase.strip
  end

  def password_required?
    new_record? || password.present?
  end

  def networks_must_be_valid
    return if networks.blank?

    invalid = networks - VALID_NETWORKS
    if invalid.any?
      errors.add(:networks, "contains invalid values: #{invalid.join(', ')}")
    end
  end
end

# frozen_string_literal: true

# API key for the partner-facing quote API (POST /api/v1/quote_api/quotes).
#
# Keys are high-entropy random tokens, so SHA256 is both sufficient and preferable
# to bcrypt here: it lets us look the key up by an indexed digest instead of
# scanning every row and running a deliberately-slow KDF on each request.
# Same convention as User#magic_link_token_digest.
#
# margin_identity is fed to MarginRuleResolver so a partner's margin comes from
# margin_rules (editable in the admin UI) and never from the request payload.
class PartnerApiKey < ApplicationRecord
  KEY_PREFIX = "sqp_live_"
  PREFIX_LENGTH = 16

  has_many :quotes, dependent: :nullify

  validates :name, presence: true, length: { maximum: 100 }
  validates :key_digest, presence: true, uniqueness: true
  validates :key_prefix, presence: true

  scope :usable, -> { where(is_active: true, revoked_at: nil) }

  # Returns the plaintext key. It is never stored — show it once at creation.
  def self.generate_raw_key
    "#{KEY_PREFIX}#{SecureRandom.urlsafe_base64(32)}"
  end

  # Look up a usable key by its plaintext token. Returns nil for unknown,
  # inactive, or revoked keys so callers cannot distinguish the failure modes.
  def self.authenticate(raw_key)
    return nil if raw_key.blank?

    usable.find_by(key_digest: digest_for(raw_key))
  end

  def self.digest_for(raw_key)
    Digest::SHA256.hexdigest(raw_key)
  end

  def assign_raw_key(raw_key)
    self.key_digest = self.class.digest_for(raw_key)
    self.key_prefix = raw_key[0, PREFIX_LENGTH]
  end

  def touch_last_used!
    update_column(:last_used_at, Time.current)
  end

  def revoke!
    update!(is_active: false, revoked_at: Time.current)
  end
end

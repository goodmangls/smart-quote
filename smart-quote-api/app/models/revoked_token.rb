# A revoked JWT, remembered by jti until the token would have expired anyway.
class RevokedToken < ApplicationRecord
  def self.revoke!(jti, expires_at:)
    return if jti.blank? || expires_at <= Time.current

    # Revoking twice (double logout, retried request) is not an error.
    insert({ jti: jti, expires_at: expires_at, created_at: Time.current }, unique_by: :jti)
    # Production runs no job scheduler (no worker, no SOLID_QUEUE_IN_PUMA), so
    # recurring.yml never fires. Pruning here keeps the table bounded instead.
    prune!
  end

  def self.revoked?(jti)
    jti.present? && exists?(jti: jti)
  end

  # Rows past expires_at protect nothing: the token's own exp already rejects it.
  def self.prune!
    where(expires_at: ..Time.current).delete_all
  end
end

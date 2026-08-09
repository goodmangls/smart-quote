# frozen_string_literal: true

# Issue and revoke partner API keys for the quote API.
#
# The plaintext key is shown ONCE at creation and never stored — only its SHA256
# digest is persisted. If it is lost, revoke the key and issue a new one.
#
#   bin/rails "partner_api_keys:issue[Naxco Belgium,bridgelogis@partner.quote-api]"
#   bin/rails partner_api_keys:list
#   bin/rails "partner_api_keys:revoke[3]"
namespace :partner_api_keys do
  desc "Issue a partner API key. Args: name, margin_identity (optional), nationality (optional)"
  task :issue, [ :name, :margin_identity, :nationality ] => :environment do |_t, args|
    if args[:name].blank?
      abort "Usage: bin/rails \"partner_api_keys:issue[Partner Name,identity@partner.quote-api]\""
    end

    raw = PartnerApiKey.generate_raw_key
    key = PartnerApiKey.new(
      name: args[:name],
      margin_identity: args[:margin_identity].presence,
      nationality: args[:nationality].presence
    )
    key.assign_raw_key(raw)
    key.save!

    margin = MarginRuleResolver.resolve(
      email: key.margin_identity, nationality: key.nationality, weight: 0
    )

    puts <<~OUT

      Partner API key issued
      ----------------------
      id              : #{key.id}
      name            : #{key.name}
      margin_identity : #{key.margin_identity || '(none — resolver default applies)'}
      resolved margin : #{margin[:margin_percent]}%#{margin[:fallback] ? ' (fallback — no matching margin_rule)' : " (rule: #{margin[:matched_rule]&.name})"}

      API key (shown once, store it now):

        #{raw}

      Usage:
        curl -X POST https://<host>/api/v1/quote_api/quotes \\
          -H "X-API-Key: #{raw}" \\
          -H "Content-Type: application/json" \\
          -d '{"carrier":"UPS","origin":{"country":"KR"},...}'

    OUT
  end

  desc "List partner API keys (digests only — plaintext is never stored)"
  task list: :environment do
    keys = PartnerApiKey.order(:id)
    if keys.empty?
      puts "No partner API keys."
      next
    end

    keys.each do |k|
      state = if k.revoked_at then "REVOKED #{k.revoked_at.iso8601}"
      elsif !k.is_active then "INACTIVE"
      else "active"
      end
      puts format(
        "#%-4d %-28s %-14s identity=%-32s last_used=%s",
        k.id, k.name, state, k.margin_identity || "-", k.last_used_at&.iso8601 || "never"
      )
    end
  end

  desc "Revoke a partner API key. Args: id"
  task :revoke, [ :id ] => :environment do |_t, args|
    abort "Usage: bin/rails \"partner_api_keys:revoke[ID]\"" if args[:id].blank?

    key = PartnerApiKey.find(args[:id])
    key.revoke!
    puts "Revoked ##{key.id} #{key.name} at #{key.revoked_at.iso8601}"
  end
end

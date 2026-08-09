require "rails_helper"

RSpec.describe PartnerApiKey, type: :model do
  describe ".generate_raw_key" do
    it "is prefixed and high-entropy" do
      raw = described_class.generate_raw_key

      expect(raw).to start_with("sqp_live_")
      # urlsafe_base64(32) => 43 chars after the prefix
      expect(raw.delete_prefix("sqp_live_").length).to be >= 40
    end

    it "does not repeat" do
      keys = Array.new(20) { described_class.generate_raw_key }

      expect(keys.uniq.length).to eq(20)
    end
  end

  describe "#assign_raw_key" do
    it "stores only a SHA256 digest, never the plaintext" do
      raw = described_class.generate_raw_key
      key = described_class.new(name: "T")
      key.assign_raw_key(raw)

      expect(key.key_digest).to eq(Digest::SHA256.hexdigest(raw))
      expect(key.key_digest).not_to include(raw)
      expect(key.attributes.values.map(&:to_s)).not_to include(raw)
    end

    it "stores a prefix that identifies the key without revealing it" do
      raw = described_class.generate_raw_key
      key = described_class.new(name: "T")
      key.assign_raw_key(raw)

      expect(raw).to start_with(key.key_prefix)
      expect(key.key_prefix.length).to be <= 16
    end
  end

  describe ".authenticate" do
    let!(:key) { create(:partner_api_key) }
    let(:raw) { key.instance_variable_get(:@raw_key) }

    it "returns the key for a valid plaintext token" do
      expect(described_class.authenticate(raw)).to eq(key)
    end

    it "returns nil for an unknown token" do
      expect(described_class.authenticate("sqp_live_nope")).to be_nil
    end

    it "returns nil for a blank token" do
      expect(described_class.authenticate(nil)).to be_nil
      expect(described_class.authenticate("")).to be_nil
    end

    it "returns nil for an inactive key" do
      key.update!(is_active: false)

      expect(described_class.authenticate(raw)).to be_nil
    end

    it "returns nil for a revoked key" do
      key.update!(revoked_at: Time.current)

      expect(described_class.authenticate(raw)).to be_nil
    end
  end

  describe "#touch_last_used!" do
    it "records the time the key was last used" do
      key = create(:partner_api_key, last_used_at: nil)

      expect { key.touch_last_used! }.to change { key.reload.last_used_at }.from(nil)
    end
  end

  describe "#revoke!" do
    it "deactivates the key so authenticate stops accepting it" do
      key = create(:partner_api_key)
      raw = key.instance_variable_get(:@raw_key)

      key.revoke!

      expect(key.reload.is_active).to be(false)
      expect(key.revoked_at).to be_present
      expect(described_class.authenticate(raw)).to be_nil
    end
  end

  describe "validations" do
    it "requires a name" do
      key = build(:partner_api_key, name: nil)

      expect(key).not_to be_valid
    end

    it "rejects a duplicate digest" do
      existing = create(:partner_api_key)
      dupe = build(:partner_api_key)
      dupe.key_digest = existing.key_digest

      expect(dupe).not_to be_valid
    end
  end
end

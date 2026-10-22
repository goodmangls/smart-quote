require "rails_helper"

RSpec.describe RevokedToken do
  describe ".revoke!" do
    it "remembers the jti" do
      described_class.revoke!("jti-1", expires_at: 1.hour.from_now)

      expect(described_class.revoked?("jti-1")).to be true
      expect(described_class.revoked?("jti-2")).to be false
    end

    it "is idempotent" do
      2.times { described_class.revoke!("jti-1", expires_at: 1.hour.from_now) }

      expect(described_class.where(jti: "jti-1").count).to eq(1)
    end

    it "skips a token that has already expired" do
      described_class.revoke!("jti-old", expires_at: 1.minute.ago)

      expect(described_class.count).to eq(0)
    end

    it "ignores a blank jti" do
      described_class.revoke!(nil, expires_at: 1.hour.from_now)

      expect(described_class.count).to eq(0)
      expect(described_class.revoked?(nil)).to be false
    end

    it "prunes rows whose token has expired" do
      described_class.create!(jti: "stale", expires_at: 1.minute.ago)

      described_class.revoke!("fresh", expires_at: 1.hour.from_now)

      expect(described_class.pluck(:jti)).to eq([ "fresh" ])
    end
  end
end

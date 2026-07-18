require "rails_helper"

RSpec.describe User, type: :model do
  describe "validations" do
    subject { build(:user) }

    it { is_expected.to validate_presence_of(:email) }
    it { is_expected.to validate_uniqueness_of(:email).case_insensitive }
    it { is_expected.to validate_inclusion_of(:role).in_array(%w[admin user member]) }

    it "requires password minimum 6 characters" do
      user = build(:user, password: "short", password_confirmation: "short")
      expect(user).not_to be_valid
      expect(user.errors[:password]).to include("is too short (minimum is 6 characters)")
    end

    it "rejects invalid email format" do
      user = build(:user, email: "not-an-email")
      expect(user).not_to be_valid
    end
  end

  describe "associations" do
    it { is_expected.to have_many(:quotes).dependent(:nullify) }
  end

  describe "callbacks" do
    it "downcases email before save" do
      user = create(:user, email: "TEST@Example.COM")
      expect(user.reload.email).to eq("test@example.com")
    end
  end

  describe "has_secure_password" do
    it "authenticates with correct password" do
      user = create(:user, password: "password123")
      expect(user.authenticate("password123")).to eq(user)
    end

    it "rejects incorrect password" do
      user = create(:user, password: "password123")
      expect(user.authenticate("wrong")).to be_falsey
    end
  end

  describe "magic link methods" do
    let(:user) { create(:user) }

    describe "#generate_magic_link_token!" do
      it "returns a raw token and stores only the SHA256 digest" do
        raw = user.generate_magic_link_token!
        expect(raw).to be_present
        expect(raw.length).to be >= 43 # urlsafe_base64(32) -> 43 chars

        user.reload
        expect(user.magic_link_token_digest).to eq(Digest::SHA256.hexdigest(raw))
        expect(user.magic_link_token_digest).not_to eq(raw)
        expect(user.magic_link_token_expires_at).to be_within(5.seconds).of(15.minutes.from_now)
      end

      it "generates a new token on each call" do
        r1 = user.generate_magic_link_token!
        r2 = user.generate_magic_link_token!
        expect(r1).not_to eq(r2)
      end
    end

    describe "#magic_link_valid?" do
      it "returns true for the correct raw token" do
        raw = user.generate_magic_link_token!
        expect(user.magic_link_valid?(raw)).to be true
      end

      it "returns false for an incorrect token" do
        user.generate_magic_link_token!
        expect(user.magic_link_valid?("wrong-token")).to be false
      end

      it "returns false for an expired token" do
        raw = user.generate_magic_link_token!
        user.update_columns(magic_link_token_expires_at: 1.minute.ago)
        expect(user.magic_link_valid?(raw)).to be false
      end

      it "returns false when digest is nil" do
        expect(user.magic_link_valid?("anything")).to be false
      end
    end

    describe "#consume_magic_link_token!" do
      it "nils out the digest and expiry" do
        user.generate_magic_link_token!
        user.consume_magic_link_token!
        user.reload
        expect(user.magic_link_token_digest).to be_nil
        expect(user.magic_link_token_expires_at).to be_nil
      end
    end
  end
end

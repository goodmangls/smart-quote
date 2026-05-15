require "rails_helper"

RSpec.describe QuoteSearcher do
  let!(:q1) { create(:quote, total_quote_amount: 100_000,   total_quote_amount_usd: 70.00,    destination_country: "JP") }
  let!(:q2) { create(:quote, total_quote_amount: 1_000_000, total_quote_amount_usd: 700.00,   destination_country: "JP") }
  let!(:q3) { create(:quote, total_quote_amount: 5_000_000, total_quote_amount_usd: 3_500.00, destination_country: "US") }

  describe ".call with amount range" do
    it "filters by KRW range" do
      result = described_class.call(Quote.all, "min_amount" => 500_000, "max_amount" => 2_000_000, "amount_currency" => "KRW")
      expect(result).to contain_exactly(q2)
    end

    it "filters by USD range" do
      result = described_class.call(Quote.all, "min_amount" => 500, "max_amount" => 1_000, "amount_currency" => "USD")
      expect(result).to contain_exactly(q2)
    end

    it "combines amount range with destination filter" do
      result = described_class.call(Quote.all, "destination_country" => "JP", "min_amount" => 50_000, "amount_currency" => "KRW")
      expect(result).to contain_exactly(q1, q2)
    end

    it "raises InvalidRangeError when min > max" do
      expect {
        described_class.call(Quote.all, "min_amount" => 1_000_000, "max_amount" => 100_000, "amount_currency" => "KRW")
      }.to raise_error(QuoteSearcher::InvalidRangeError, /amount range/i)
    end

    it "ignores blank amount params" do
      result = described_class.call(Quote.all, "min_amount" => "", "max_amount" => nil, "amount_currency" => "KRW")
      expect(result.count).to eq(3)
    end
  end
end

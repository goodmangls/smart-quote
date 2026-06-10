import { render, screen } from '@testing-library/react';
import { CostBreakdownCard } from '../CostBreakdownCard';
import type { QuoteResult } from '@/types';

let mockLanguage: 'en' | 'ko' | 'cn' | 'ja' = 'en';

const dictionaries = {
  en: {
    'quote.logisticsCost': 'Logistics Cost Breakdown',
    'quote.cost.freight': 'Freight Cost',
    'quote.cost.baseRate': 'Base Rate',
    'quote.cost.freightTotal': 'Freight Total',
    'quote.cost.addOns': 'Add-ons',
    'quote.cost.carrierAddOns': '{carrier} Add-ons',
    'quote.cost.toggleCurrency': 'Toggle currency',
    'quote.cost.internal': 'Internal',
    'quote.cost.plusFsc': '+FSC',
    'quote.cost.addon.ihf': 'International Processing Fee',
    'quote.cost.addon.sgf': 'Surge Fee ({region})',
    'quote.cost.region.usAmericas': 'U.S. & Americas',
    'quote.finalPrice': 'Final Quote Price',
    'quote.approx': 'Approx.',
    'quote.disclaimer.customsTitle': 'Customs & Duties Disclaimer',
    'quote.disclaimer.customsBody': 'Quoted prices exclude destination duties.',
    'calc.costBasis.disclaimer': 'Prices include estimated surcharges.',
  },
  ko: {
    'quote.logisticsCost': '물류 비용 상세',
    'quote.cost.freight': '운송 비용',
    'quote.cost.baseRate': '기본 운임',
    'quote.cost.freightTotal': '운송비 합계',
    'quote.cost.addOns': '부가 비용',
    'quote.cost.carrierAddOns': '{carrier} 부가 서비스',
    'quote.cost.toggleCurrency': '통화 전환',
    'quote.cost.internal': '내부용',
    'quote.cost.plusFsc': '+FSC',
    'quote.cost.addon.ihf': '국제 처리 수수료',
    'quote.cost.addon.sgf': '급증수수료 ({region})',
    'quote.cost.region.usAmericas': '미국 및 미주',
    'quote.finalPrice': '최종 견적가',
    'quote.approx': '약',
    'quote.disclaimer.customsTitle': '관세 및 세금 안내',
    'quote.disclaimer.customsBody': '견적 금액에는 도착지 관세가 포함되지 않습니다.',
    'calc.costBasis.disclaimer': '예상 할증료가 포함됩니다.',
  },
  cn: {
    'quote.logisticsCost': '物流费用明细',
    'quote.cost.freight': '运输费用',
    'quote.cost.baseRate': '基础运费',
    'quote.cost.freightTotal': '运费合计',
    'quote.cost.addOns': '附加费用',
    'quote.cost.carrierAddOns': '{carrier} 附加服务',
    'quote.cost.toggleCurrency': '切换货币',
    'quote.cost.internal': '内部',
    'quote.cost.plusFsc': '+FSC',
    'quote.cost.addon.ihf': '国际处理费',
    'quote.cost.addon.sgf': '高峰附加费（{region}）',
    'quote.cost.region.usAmericas': '美国及美洲',
    'quote.finalPrice': '最终报价',
    'quote.approx': '约',
    'quote.disclaimer.customsTitle': '关税及税费说明',
    'quote.disclaimer.customsBody': '报价不包含目的地关税。',
    'calc.costBasis.disclaimer': '价格包含预估附加费。',
  },
  ja: {
    'quote.logisticsCost': '物流費用内訳',
    'quote.cost.freight': '運送費用',
    'quote.cost.baseRate': '基本運賃',
    'quote.cost.freightTotal': '運送費合計',
    'quote.cost.addOns': '追加費用',
    'quote.cost.carrierAddOns': '{carrier} 追加サービス',
    'quote.cost.toggleCurrency': '通貨切替',
    'quote.cost.internal': '社内用',
    'quote.cost.plusFsc': '+FSC',
    'quote.cost.addon.ihf': '国際処理手数料',
    'quote.cost.addon.sgf': 'サージ手数料（{region}）',
    'quote.cost.region.usAmericas': '米国・米州',
    'quote.finalPrice': '最終見積価格',
    'quote.approx': '約',
    'quote.disclaimer.customsTitle': '関税・税金に関する注意',
    'quote.disclaimer.customsBody': '見積金額には仕向地関税は含まれていません。',
    'calc.costBasis.disclaimer': '価格には推定サーチャージが含まれます。',
  },
} as const;

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: mockLanguage,
    setLanguage: vi.fn(),
    t: (key: string) => dictionaries[mockLanguage][key as keyof (typeof dictionaries)['en']] ?? key,
  }),
}));

const result: QuoteResult = {
  totalQuoteAmount: 123500,
  totalQuoteAmountUSD: 88.21,
  totalCostAmount: 100000,
  profitAmount: 10000,
  profitMargin: 8.1,
  currency: 'KRW',
  totalActualWeight: 4,
  totalVolumetricWeight: 4,
  billableWeight: 4,
  appliedZone: 'Z5/Americas',
  transitTime: '2-5 days',
  carrier: 'UPS',
  warnings: [],
  breakdown: {
    packingMaterial: 0,
    packingLabor: 0,
    packingFumigation: 0,
    handlingFees: 0,
    pickupInSeoul: 0,
    intlBase: 82931,
    intlFsc: 35868,
    intlWarRisk: 0,
    intlSurge: 4673,
    carrierAddOnTotal: 4673,
    carrierAddOnDetails: [
      {
        code: 'IHF',
        nameKo: '국제 처리 수수료',
        nameEn: 'International Processing Fee',
        amount: 3642,
        fscAmount: 0,
      },
      {
        code: 'SGF',
        nameKo: '급증수수료 (U.S. & Americas)',
        nameEn: 'Surge Fee (U.S. & Americas)',
        amount: 720,
        fscAmount: 311,
      },
    ],
    destDuty: 0,
    totalCost: 123500,
  },
};

const renderCard = () =>
  render(<CostBreakdownCard result={result} onMarginChange={vi.fn()} marginPercent={15} />);

describe('CostBreakdownCard carrier add-on localization', () => {
  it('does not render Korean carrier add-on names in English', () => {
    mockLanguage = 'en';
    renderCard();

    expect(screen.getByText('International Processing Fee (IHF)')).toBeInTheDocument();
    expect(screen.getByText('Surge Fee (U.S. & Americas) (SGF)')).toBeInTheDocument();
    expect(screen.queryByText(/국제 처리 수수료|급증수수료/)).not.toBeInTheDocument();
  });

  it('renders carrier add-on names in Japanese', () => {
    mockLanguage = 'ja';
    renderCard();

    expect(screen.getByText('国際処理手数料 (IHF)')).toBeInTheDocument();
    expect(screen.getByText('サージ手数料（米国・米州） (SGF)')).toBeInTheDocument();
    expect(screen.queryByText(/국제 처리 수수료|급증수수료/)).not.toBeInTheDocument();
  });

  it('renders carrier add-on names in Chinese', () => {
    mockLanguage = 'cn';
    renderCard();

    expect(screen.getByText('国际处理费 (IHF)')).toBeInTheDocument();
    expect(screen.getByText('高峰附加费（美国及美洲） (SGF)')).toBeInTheDocument();
    expect(screen.queryByText(/국제 처리 수수료|급증수수료/)).not.toBeInTheDocument();
  });
});

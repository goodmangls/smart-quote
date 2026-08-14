import { calculateDhlAddOnCosts } from '../dhlAddonCalculator';
import { PackingType, Incoterm } from '@/types';
import type { QuoteInput } from '@/types';

const makeInput = (overrides: Partial<QuoteInput> = {}): QuoteInput =>
  ({
    originCountry: 'KR',
    destinationCountry: 'JP',
    destinationZip: '',
    incoterm: Incoterm.DAP,
    packingType: PackingType.NONE,
    items: [{ id: '1', length: 30, width: 30, height: 30, weight: 20, quantity: 1 }],
    marginPercent: 15,
    dutyTaxEstimate: 0,
    exchangeRate: 1400,
    fscPercent: 0,
    dhlAddOns: [],
    ...overrides,
  }) as QuoteInput;

describe('calculateDhlAddOnCosts', () => {
  it('추가 옵션 없음: total=0', () => {
    const { total } = calculateDhlAddOnCosts(makeInput(), 20, 0);
    expect(total).toBe(0);
  });

  it('OSP 자동 감지 (l=110): total=30000', () => {
    const input = makeInput({
      items: [{ id: '1', length: 110, width: 30, height: 30, weight: 20, quantity: 1 }],
    });
    // sorted=[110,30,30], 110>100 → OSP, amount=30000, fsc=0
    const { total } = calculateDhlAddOnCosts(input, 20, 0);
    expect(total).toBe(30_000);
  });

  it('OSP + FSC 46%: total=43800', () => {
    const input = makeInput({
      items: [{ id: '1', length: 110, width: 30, height: 30, weight: 20, quantity: 1 }],
    });
    // 30000 + 30000*0.46 = 30000 + 13800 = 43800
    const { total } = calculateDhlAddOnCosts(input, 20, 46);
    expect(total).toBe(43_800);
  });

  it('OWT 자동 감지 (wt=80): total=150000', () => {
    const input = makeInput({
      items: [{ id: '1', length: 30, width: 30, height: 30, weight: 80, quantity: 1 }],
    });
    // 80>70 → OWT, amount=150000, fsc=0
    const { total } = calculateDhlAddOnCosts(input, 80, 0);
    expect(total).toBe(150_000);
  });

  it('RMT 선택 wt=50: total=37500', () => {
    const input = makeInput({ dhlAddOns: ['RMT'] });
    // max(35000, ceil(50)*750) = max(35000, 37500) = 37500
    const { total } = calculateDhlAddOnCosts(input, 50, 0);
    expect(total).toBe(37_500);
  });

  it('INS 선택 declaredValue=2000000: total=20000', () => {
    const input = makeInput({ dhlAddOns: ['INS'], dhlDeclaredValue: 2_000_000 });
    // max(2000000*0.01, 17000) = max(20000, 17000) = 20000, fscApplicable=false
    const { total } = calculateDhlAddOnCosts(input, 20, 0);
    expect(total).toBe(20_000);
  });

  it('IRR 선택 수량=2 + FSC 46%: total=87600', () => {
    const input = makeInput({
      items: [{ id: '1', length: 30, width: 30, height: 30, weight: 20, quantity: 2 }],
      dhlAddOns: ['IRR'],
    });
    // 30000*2=60000, fsc=60000*0.46=27600 → 87600
    const { total } = calculateDhlAddOnCosts(input, 20, 46);
    expect(total).toBe(87_600);
  });

  it('OSP 2번째 긴 변 >80cm: total=30000', () => {
    const input = makeInput({
      items: [{ id: '1', length: 90, width: 85, height: 30, weight: 20, quantity: 1 }],
    });
    // sorted=[90,85,30], sorted[1]=85 > 80 → OSP 자동 감지
    const { total } = calculateDhlAddOnCosts(input, 20, 0);
    expect(total).toBe(30_000);
  });

  it('OSP 경계값: 최장변=100cm → OSP 미적용 (total=0)', () => {
    const input = makeInput({
      items: [{ id: '1', length: 100, width: 30, height: 30, weight: 20, quantity: 1 }],
    });
    // sorted[0]=100, 조건은 >100 (strictly) → 100은 미적용
    const { total } = calculateDhlAddOnCosts(input, 20, 0);
    expect(total).toBe(0);
  });

  it('OSP 수량=2: total=60000', () => {
    const input = makeInput({
      items: [{ id: '1', length: 110, width: 30, height: 30, weight: 20, quantity: 2 }],
    });
    // OSP per_piece: 30000 * 2 = 60000
    const { total } = calculateDhlAddOnCosts(input, 20, 0);
    expect(total).toBe(60_000);
  });

  it('OWT 경계값: wt=70kg → OWT 미적용 (total=0)', () => {
    const input = makeInput({
      items: [{ id: '1', length: 30, width: 30, height: 30, weight: 70, quantity: 1 }],
    });
    // weight > 70 (strictly) → wt=70은 미적용
    const { total } = calculateDhlAddOnCosts(input, 70, 0);
    expect(total).toBe(0);
  });

  it('OWT + FSC 46%: total=219000', () => {
    const input = makeInput({
      items: [{ id: '1', length: 30, width: 30, height: 30, weight: 80, quantity: 1 }],
    });
    // 150000 + 150000*0.46 = 150000 + 69000 = 219000
    const { total } = calculateDhlAddOnCosts(input, 80, 46);
    expect(total).toBe(219_000);
  });

  it('RMT 최소금액 적용 (wt=10): total=35000', () => {
    const input = makeInput({ dhlAddOns: ['RMT'] });
    // max(35000, ceil(10)*750=7500) = 35000
    const { total } = calculateDhlAddOnCosts(input, 10, 0);
    expect(total).toBe(35_000);
  });

  it('DB 요금 오버라이드: resolvedAddonRates 사용', () => {
    const input = makeInput({
      items: [{ id: '1', length: 110, width: 30, height: 30, weight: 20, quantity: 1 }],
      resolvedAddonRates: [
        {
          carrier: 'DHL',
          code: 'OSP',
          amount: 40000,
          fscApplicable: true,
          nameKo: '대형화물',
          nameEn: 'Oversize Piece',
          chargeType: 'per_piece',
          unit: 'piece',
          perKgRate: null,
          ratePercent: null,
          minAmount: null,
          autoDetect: true,
          selectable: false,
          condition: null,
          detectRules: null,
        },
      ],
    });
    // DB 요금(40000)이 기본 하드코딩(30000)을 대체해야 함
    const { total } = calculateDhlAddOnCosts(input, 20, 0);
    expect(total).toBe(40_000);
  });
});

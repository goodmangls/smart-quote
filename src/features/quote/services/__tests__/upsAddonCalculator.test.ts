import { calculateUpsAddOnCosts } from '../upsAddonCalculator';
import { PackingType, Incoterm } from '@/types';
import type { QuoteInput } from '@/types';

const IHF = 3642;
const JP_SEF_PER_KG = 143;
const AE_IL_SEF_PER_KG = 4722;
const MIDDLE_EAST_SEF_PER_KG = 4220;

const sef = (billableWeight: number, perKgRate = JP_SEF_PER_KG, fscPercent = 0) => {
  const amount = Math.ceil(billableWeight) * perKgRate;
  return amount + amount * (fscPercent / 100);
};

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
    exchangeRate: 1450,
    fscPercent: 0,
    upsAddOns: [],
    ...overrides,
  }) as QuoteInput;

describe('calculateUpsAddOnCosts', () => {
  it('기본 UPS JP 견적: IHF + Asia Pacific SEF 143원/kg이 자동 적용된다', () => {
    const { total, details } = calculateUpsAddOnCosts(makeInput(), 10, 0);
    expect(total).toBe(IHF + 1430);
    expect(details).toContainEqual({
      code: 'IHF',
      nameKo: '국제 처리 수수료',
      nameEn: 'International Processing Fee',
      amount: IHF,
      fscAmount: 0,
    });
    expect(details).toContainEqual({
      code: 'SGF',
      nameKo: '급증수수료 (Asia Pacific)',
      nameEn: 'Surge Fee (Asia Pacific)',
      amount: 1430,
      fscAmount: 0,
    });
  });

  it('UPS US 행선지: 공식 표 기준 U.S. & Americas 720원/kg이 자동 적용된다', () => {
    const input = makeInput({ destinationCountry: 'US' });
    const { total, details } = calculateUpsAddOnCosts(input, 10, 0);
    expect(total).toBe(IHF + 7200);
    expect(details).toContainEqual({
      code: 'SGF',
      nameKo: '급증수수료 (U.S. & Americas)',
      nameEn: 'Surge Fee (U.S. & Americas)',
      amount: 7200,
      fscAmount: 0,
    });
  });

  it('UPS US 행선지 + FSC 50%: SEF에도 FSC가 적용된다', () => {
    const input = makeInput({ destinationCountry: 'US' });
    const { total, details } = calculateUpsAddOnCosts(input, 10, 50);
    expect(total).toBe(IHF + 10800);
    expect(details.find(d => d.code === 'SGF')).toMatchObject({ amount: 7200, fscAmount: 3600 });
  });

  it('U.A.E./Israel 권역: 4,722원/kg이 자동 적용된다', () => {
    const input = makeInput({ destinationCountry: 'AE' });
    const { total } = calculateUpsAddOnCosts(input, 10, 0);
    expect(total).toBe(IHF + sef(10, AE_IL_SEF_PER_KG));
  });

  it('Middle East 권역: 4,220원/kg이 자동 적용된다', () => {
    const input = makeInput({ destinationCountry: 'SA' });
    const { total } = calculateUpsAddOnCosts(input, 10, 0);
    expect(total).toBe(IHF + sef(10, MIDDLE_EAST_SEF_PER_KG));
  });

  it('DDP 자동 감지: IHF + JP SEF + DDP', () => {
    const input = makeInput({ incoterm: Incoterm.DDP });
    const { total } = calculateUpsAddOnCosts(input, 10, 0);
    expect(total).toBe(IHF + sef(10) + 28500);
  });

  it('AHS 자동 감지 (wt=26): IHF + JP SEF + AHS', () => {
    const input = makeInput({
      items: [{ id: '1', length: 30, width: 30, height: 30, weight: 26, quantity: 1 }],
    });
    const { total } = calculateUpsAddOnCosts(input, 26, 0);
    expect(total).toBe(IHF + sef(26) + 21400);
  });

  it('AHS + FSC 48.5%: AHS와 SEF에 FSC가 적용되고 IHF는 FSC 미적용', () => {
    const input = makeInput({
      items: [{ id: '1', length: 30, width: 30, height: 30, weight: 26, quantity: 1 }],
    });
    const ahsWithFsc = 21400 + 21400 * 0.485;
    const { total } = calculateUpsAddOnCosts(input, 26, 48.5);
    expect(total).toBeCloseTo(IHF + sef(26, JP_SEF_PER_KG, 48.5) + ahsWithFsc, 6);
  });

  it('RMT 선택 wt=10: IHF + JP SEF + RMT min금액', () => {
    const input = makeInput({ upsAddOns: ['RMT'] });
    const { total } = calculateUpsAddOnCosts(input, 10, 0);
    expect(total).toBe(IHF + sef(10) + 31400);
  });

  it('EXT 선택 wt=60: IHF + JP SEF + EXT rate 적용', () => {
    const input = makeInput({ upsAddOns: ['EXT'] });
    const { total } = calculateUpsAddOnCosts(input, 60, 0);
    expect(total).toBe(IHF + sef(60) + 38400);
  });

  it('ADC 선택 수량=2: IHF + JP SEF + ADC', () => {
    const input = makeInput({
      items: [{ id: '1', length: 30, width: 30, height: 30, weight: 20, quantity: 2 }],
      upsAddOns: ['ADC'],
    });
    const { total } = calculateUpsAddOnCosts(input, 20, 0);
    expect(total).toBe(IHF + sef(20) + 30200);
  });

  it('AHS 경계값: wt=25 → AHS 미적용, IHF + JP SEF만 적용', () => {
    const input = makeInput({
      items: [{ id: '1', length: 30, width: 30, height: 30, weight: 25, quantity: 1 }],
    });
    const { total } = calculateUpsAddOnCosts(input, 25, 0);
    expect(total).toBe(IHF + sef(25));
  });

  it('국내 KR→KR 화물에는 SEF를 적용하지 않는다', () => {
    const input = makeInput({ destinationCountry: 'KR' });
    const { total, details } = calculateUpsAddOnCosts(input, 10, 0);
    expect(total).toBe(IHF);
    expect(details.some(d => d.code === 'SGF')).toBe(false);
  });

  it('stale/manual SEF 선택값은 자동 SEF와 중복 과금하지 않는다', () => {
    const input = makeInput({ destinationCountry: 'US', upsAddOns: ['SEF'] });
    const { total, details } = calculateUpsAddOnCosts(input, 10, 0);
    expect(total).toBe(IHF + 7200);
    expect(details.filter(d => d.code === 'SGF')).toHaveLength(1);
    expect(details.some(d => d.code === 'SEF')).toBe(false);
  });

  it('DB 요금 오버라이드: DDP는 DB 요금, IHF/SEF는 항상 자동 적용', () => {
    const input = makeInput({
      incoterm: Incoterm.DDP,
      resolvedAddonRates: [
        {
          carrier: 'UPS',
          code: 'DDP',
          amount: 30000,
          fscApplicable: false,
          nameKo: 'DDP 수수료',
          nameEn: 'DDP Service Fee',
          chargeType: 'fixed',
          unit: 'shipment',
          perKgRate: null,
          ratePercent: null,
          minAmount: null,
          autoDetect: false,
          selectable: true,
          condition: null,
          detectRules: null,
        },
      ],
    });
    const { total } = calculateUpsAddOnCosts(input, 10, 0);
    expect(total).toBe(IHF + sef(10) + 30000);
  });
});

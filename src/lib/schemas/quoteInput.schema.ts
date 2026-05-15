import { z } from 'zod';
import { Incoterm, PackingType } from '@/types';

export const cargoItemSchema = z.object({
  id: z.string().min(1, 'id is required'),
  width: z.number().positive().max(1000, 'width must be < 1000cm'),
  length: z.number().positive().max(1000, 'length must be < 1000cm'),
  height: z.number().positive().max(1000, 'height must be < 1000cm'),
  weight: z.number().positive().max(10000, 'weight must be < 10000kg per box'),
  quantity: z.number().int().positive().max(10000),
});

// Bound to the runtime TS enums (@/types) so the schema cannot drift from them.
export const incotermSchema = z.enum(Incoterm);
export const packingTypeSchema = z.enum(PackingType);
export const shippingModeSchema = z.enum(['Door-to-Door', 'Door-to-Airport']);
export const carrierSchema = z.enum(['UPS', 'DHL']);

const resolvedSurchargeSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().max(200),
  nameKo: z.string().max(200).nullable(),
  chargeType: z.enum(['fixed', 'rate']),
  amount: z.number().min(0).max(1e10),
  sourceUrl: z.string().max(500).nullable(),
});

const resolvedAddonRateSchema = z.object({
  code: z.string().min(1).max(50),
  carrier: carrierSchema,
  nameEn: z.string().max(200),
  nameKo: z.string().max(200),
  chargeType: z.enum(['fixed', 'per_piece', 'per_carton', 'calculated']),
  unit: z.enum(['shipment', 'piece', 'carton']),
  amount: z.number().min(0).max(1e10),
  perKgRate: z.number().min(0).max(1e10).nullable(),
  ratePercent: z.number().min(0).max(1e6).nullable(),
  minAmount: z.number().min(0).max(1e10).nullable(),
  fscApplicable: z.boolean(),
  autoDetect: z.boolean(),
  selectable: z.boolean(),
  condition: z.string().max(500).nullable(),
  detectRules: z.record(z.string(), z.union([z.number(), z.array(z.string())])).nullable(),
});

export const quoteInputSchema = z.object({
  originCountry: z.string().length(2, 'originCountry must be ISO 2-letter'),
  destinationCountry: z.string().length(2, 'destinationCountry must be ISO 2-letter'),
  destinationZip: z.string().max(20).optional().default(''),
  incoterm: incotermSchema,
  packingType: packingTypeSchema,
  items: z.array(cargoItemSchema).min(1, 'at least 1 item required').max(100),
  marginPercent: z.number().min(0).max(100),
  dutyTaxEstimate: z.number().min(0).max(1e9).default(0),

  exchangeRate: z.number().positive().max(10000, 'KRW/USD must be < 10000'),
  fscPercent: z.number().min(0).max(200),

  shippingMode: shippingModeSchema.optional(),
  overseasCarrier: carrierSchema.optional(),
  manualPackingCost: z.number().min(0).max(1e9).optional(),
  manualSurgeCost: z.number().min(0).max(1e9).optional(),
  pickupInSeoulCost: z.number().min(0).max(1e9).optional(),
  validityDays: z.number().int().min(1).max(365).optional(),

  dhlAddOns: z.array(z.string().min(1).max(20)).max(30).optional(),
  upsAddOns: z.array(z.string().min(1).max(20)).max(30).optional(),
  dhlDeclaredValue: z.number().min(0).max(1e10).optional(),

  resolvedSurcharges: z.array(resolvedSurchargeSchema).max(50).optional(),
  resolvedAddonRates: z.array(resolvedAddonRateSchema).max(100).optional(),
});

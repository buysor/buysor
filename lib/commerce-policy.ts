/** One source of truth. Versioned quotes remain attached to existing purchases. */
export const POLICY_VERSION = '2026-09-18-v7';
export const CREDIT_PACKS = [
  { id: 'pack20', name: '소액 팩', price: 1900, credits: 20 },
  { id: 'pack100', name: '기본 팩', price: 8900, credits: 100 },
  { id: 'pack300', name: '대용량 팩', price: 24900, credits: 300 },
] as const;
export const MEMBERSHIP = { id: 'member140', name: 'BUYSOR 멤버십', price: 9900, credits: 140, validityDays: 90 } as const;
/** New global quotes are USD cents. Legacy KRW quotes and wallet policy remain immutable. */
export const BILLING_POLICY_VERSION = '2026-09-30-global-v1';
export const USD_CREDIT_PACKS = [
  { id: 'pack20', name: 'Starter', ko: '스타터', price: 199, credits: 20 },
  { id: 'pack100', name: 'Standard', ko: '스탠다드', price: 799, credits: 100 },
  { id: 'pack300', name: 'Value', ko: '밸류', price: 1999, credits: 300 },
] as const;
export const USD_MEMBERSHIP = { ...MEMBERSHIP, name: 'BUYSOR Membership', ko: 'BUYSOR 멤버십', price: 999 } as const;
export const formatUSD = (cents: number, language: 'ko' | 'en' = 'en') => new Intl.NumberFormat(language === 'ko' ? 'ko-KR' : 'en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
export function usdProductById(id: string) { return USD_CREDIT_PACKS.find(p => p.id === id); }
export const FEATURES = {
  lens: { credits: 1, maxOutput: 700, ceilingKRW: 24 },
  standard: { credits: 10, maxOutput: 2800, ceilingKRW: 240 },
  deep: { credits: 30, maxOutput: 4800, ceilingKRW: 720 },
  rejudge: { credits: 5, maxOutput: 1800, ceilingKRW: 120 },
} as const;
export type Feature = keyof typeof FEATURES;
export const REWARDS = Object.freeze({ signup: 0, attendance: 0, roulette: 0 });
export const formatKRW = (n: number, language: 'ko' | 'en' = 'ko') =>
  language === 'ko' ? `${n.toLocaleString('ko-KR')}원` : `KRW ${n.toLocaleString('en-US')}`;
export function productById(id: string) { return CREDIT_PACKS.find(p => p.id === id); }
/** CURRENT verified standard pricing, not a promise about future provider prices. */
export const MODEL_RATES: Record<string, { input: number; output: number }> = {
  'gpt-5.6-luna': { input: 0.20, output: 1.20 },
  'gpt-5.6-terra': { input: 2, output: 12 },
  'gpt-5.6-sol': { input: 5, output: 30 },
};
// USD per million tokens numerically equals micro-USD per token.
export function costMicroUSD(model: string, input: number, output: number) {
  const rate = MODEL_RATES[model];
  if (!rate || !Number.isSafeInteger(input) || input < 0 || !Number.isSafeInteger(output) || output < 0) throw new Error('INVALID_AI_COST');
  return Math.ceil(input * rate.input + output * rate.output);
}

/** One source of truth. Versioned quotes remain attached to existing purchases. */
export const POLICY_VERSION = '2026-09-18-v7';
export const CREDIT_PACKS = [
  { id: 'pack20', name: '소액 팩', price: 1900, credits: 20 },
  { id: 'pack100', name: '기본 팩', price: 8900, credits: 100 },
  { id: 'pack300', name: '대용량 팩', price: 24900, credits: 300 },
] as const;
export const MEMBERSHIP = { id: 'member140', name: 'BUYSOR 멤버십', price: 9900, credits: 140, validityDays: 90 } as const;
export const FEATURES = {
  lens: { credits: 1, maxOutput: 700, ceilingKRW: 24 },
  standard: { credits: 10, maxOutput: 2800, ceilingKRW: 240 },
  deep: { credits: 30, maxOutput: 4800, ceilingKRW: 720 },
  rejudge: { credits: 5, maxOutput: 1800, ceilingKRW: 120 },
} as const;
export type Feature = keyof typeof FEATURES;
export const REWARDS = Object.freeze({ signup: 0, attendance: 0, roulette: 0 });
export const formatKRW = (n: number) => `${n.toLocaleString('ko-KR')}원`;
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

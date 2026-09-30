export const MARKETS = {
  US: { name: 'United States', ko: '미국', currency: 'USD', distance: 'mi', locale: 'en-US' },
  GB: { name: 'United Kingdom', ko: '영국', currency: 'GBP', distance: 'mi', locale: 'en-GB' },
  CA: { name: 'Canada', ko: '캐나다', currency: 'CAD', distance: 'km', locale: 'en-CA' },
  AU: { name: 'Australia', ko: '호주', currency: 'AUD', distance: 'km', locale: 'en-AU' },
  NZ: { name: 'New Zealand', ko: '뉴질랜드', currency: 'NZD', distance: 'km', locale: 'en-NZ' },
  KR: { name: 'South Korea', ko: '한국', currency: 'KRW', distance: 'km', locale: 'ko-KR' },
} as const;
export type Market = keyof typeof MARKETS;
export const CURRENCIES = ['USD', 'GBP', 'CAD', 'AUD', 'NZD', 'KRW'] as const;
export type Currency = typeof CURRENCIES[number];
export function isMarket(value: unknown): value is Market { return typeof value === 'string' && Object.hasOwn(MARKETS, value); }
export function isCurrency(value: unknown): value is Currency { return CURRENCIES.includes(value as Currency); }
export function formatMoney(amount: number, currency: Currency = 'USD', language: 'ko' | 'en' = 'en') {
  const value = currency === 'KRW' ? amount : amount / 100;
  const formatted = new Intl.NumberFormat(language === 'ko' ? 'ko-KR' : 'en-US', { style: 'currency', currency, currencyDisplay: 'symbol' }).format(value);
  return currency === 'USD' || currency === 'KRW' ? formatted : `${currency} ${formatted}`;
}
/** Parse decimal money without floating-point rounding or silently stripping cents. */
export function parseMoney(value: string, currency: Currency): number | null {
  const pattern = currency === 'KRW' ? /^\d{1,9}$/ : /^\d{1,7}(?:\.\d{1,2})?$/;
  if (!pattern.test(value)) return null;
  const [whole, fraction = ''] = value.split('.');
  const amount = Number(whole) * (currency === 'KRW' ? 1 : 100) + (currency === 'KRW' ? 0 : Number(fraction.padEnd(2, '0')));
  return Number.isSafeInteger(amount) && amount <= 100_000_000 ? amount : null;
}
export function validTimeZone(value: unknown): string {
  if (typeof value !== 'string' || value.length > 80) return 'UTC';
  try { new Intl.DateTimeFormat('en-US', { timeZone: value }).format(); return value; } catch { return 'UTC'; }
}
export function dateInZone(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: validTimeZone(timeZone), year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const p = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
const RANGES: Record<Currency, number[]> = { USD: [200,400,800,1600,3200], GBP: [150,300,600,1200,2400], CAD: [300,600,1200,2400,4800], AUD: [300,600,1200,2400,4800], NZD: [350,700,1400,2800,5600], KRW: [300000,500000,1000000,2000000,4000000] };
export function budgetOptions(currency: Currency, kind: 'comfort' | 'max' | 'decision', language: 'ko' | 'en') {
  const limits = kind === 'max' ? (currency === 'KRW' ? [500000,1000000,2000000,3000000,5000000] : RANGES[currency].map(n => n * 1.5)) : RANGES[currency];
  const show = (n: number) => formatMoney(n * (currency === 'KRW' ? 1 : 100), currency, language).replace(/\.00$/, '');
  const rows = limits.map((n, i) => ({ value: `budget:${currency}:${kind}:${i}`, label: i === 0 ? (language === 'ko' ? `${show(n)} 미만` : `Under ${show(n)}`) : `${show(limits[i-1])}–${show(n)}` }));
  if (kind !== 'decision') rows.push({ value: `budget:${currency}:${kind}:5`, label: `${show(limits.at(-1)!)}+` });
  rows.push({ value: `budget:${currency}:${kind}:flexible`, label: language === 'ko' ? (kind === 'max' ? '정해진 상한 없음' : '제품과 가치에 따라 조정') : (kind === 'max' ? 'No fixed maximum' : 'Flexible if worth it') });
  return rows;
}
export function budgetLabel(value: string, language: 'ko' | 'en' = 'en'): string | null {
  const match = /^budget:([A-Z]{3}):(comfort|max|decision):(\d|flexible)$/.exec(value);
  if (!match || !isCurrency(match[1])) return null;
  return budgetOptions(match[1], match[2] as 'comfort' | 'max' | 'decision', language).find(row => row.value === value)?.label ?? null;
}

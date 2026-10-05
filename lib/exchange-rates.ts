import { CURRENCIES, formatMoney, type Currency } from './market';

export const FX_STORAGE_KEY = 'buysor-reference-rates-v1';
export const FX_MAX_AGE = 7 * 86_400_000;
export const FX_REFRESH_INTERVAL = 30 * 60_000;
export type RateSnapshot = {
  version: 1;
  base: 'USD';
  source: 'frankfurter-ecb';
  date: string;
  fetchedAt: number;
  rates: Record<Currency, number>;
};
export type RateResult = { snapshot: RateSnapshot | null; status: 'latest' | 'cached' | 'unavailable' };

/** Never treat missing/invalid rates as parity, or relabel an unconverted dollar amount. */
export function readRateSnapshot(value: unknown, now = Date.now()): RateSnapshot | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Partial<RateSnapshot>;
  if (v.version !== 1 || v.base !== 'USD' || v.source !== 'frankfurter-ecb' ||
      typeof v.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v.date) ||
      typeof v.fetchedAt !== 'number' || !Number.isSafeInteger(v.fetchedAt) ||
      v.fetchedAt > now + 300_000 || v.fetchedAt < now - FX_MAX_AGE) return null;
  const observed = Date.parse(v.date + 'T00:00:00Z');
  if (!Number.isFinite(observed) || new Date(observed).toISOString().slice(0, 10) !== v.date ||
      observed > now || observed < now - FX_MAX_AGE || observed > v.fetchedAt) return null;
  const rates = v.rates;
  if (!rates || rates.USD !== 1 || !CURRENCIES.every(currency =>
    typeof rates[currency] === 'number' && Number.isFinite(rates[currency]) &&
    rates[currency] > 0 && rates[currency] <= 100_000)) return null;
  return { version: 1, base: 'USD', source: 'frankfurter-ecb', date: v.date,
    fetchedAt: v.fetchedAt, rates: Object.fromEntries(CURRENCIES.map(c => [c, v.rates![c]])) as Record<Currency, number> };
}

/** ECB rows must be complete, unique, USD based, and from the same observation day. */
export function parseEcbRates(value: unknown, now = Date.now()): RateSnapshot | null {
  if (!Array.isArray(value)) return null;
  const rates: Record<string, number> = { USD: 1 };
  let date: string | undefined;
  for (const currency of CURRENCIES.filter(c => c !== 'USD')) {
    const rows = value.filter(row => row?.quote === currency);
    if (rows.length !== 1 || rows[0].base !== 'USD' || typeof rows[0].date !== 'string') return null;
    if (date && rows[0].date !== date) return null;
    date = rows[0].date;
    rates[currency] = rows[0].rate;
  }
  return readRateSnapshot({ version: 1, base: 'USD', source: 'frankfurter-ecb', date, fetchedAt: now, rates }, now);
}

export function convertUsdCents(cents: number, currency: Currency, snapshot: RateSnapshot): number {
  if (!Number.isSafeInteger(cents) || cents < 0) throw Error('Invalid USD amount');
  const amount = Math.round(cents * snapshot.rates[currency] / (currency === 'KRW' ? 100 : 1));
  if (!Number.isSafeInteger(amount)) throw Error('Invalid converted amount');
  return amount;
}

export function servicePrice(cents: number, currency: Currency, language: 'ko' | 'en', snapshot: RateSnapshot | null) {
  const valid = snapshot && readRateSnapshot(snapshot);
  const displayedCurrency = currency !== 'USD' && valid ? currency : 'USD';
  const amount = displayedCurrency === 'USD' ? cents : convertUsdCents(cents, displayedCurrency, valid!);
  const formatted = formatMoney(amount, displayedCurrency, language);
  const label = displayedCurrency === 'USD' ? `${formatted} USD` : displayedCurrency === 'KRW' ? `KRW ${formatted}` : formatted;
  return { text: `${displayedCurrency === 'USD' ? '' : '≈ '}${label}`, currency: displayedCurrency };
}

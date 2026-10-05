import { getD1Binding } from '@/db';
import { FX_REFRESH_INTERVAL, parseEcbRates, readRateSnapshot, type RateResult, type RateSnapshot } from './exchange-rates';

const URL = 'https://api.frankfurter.dev/v2/providers/ecb/rates?base=USD&quotes=GBP,CAD,AUD,NZD,KRW';
type RateStore = { load(): Promise<unknown>; save(snapshot: RateSnapshot): Promise<void> };
async function cacheDeadline<T>(operation: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([operation, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(Error('Cache unavailable')), 1000);
    })]);
  } finally { clearTimeout(timer!); }
}

/** One request per isolate; persistent last-good rates survive worker restarts/outages. */
export function createRateService(store: RateStore, request: typeof fetch = fetch, now = Date.now) {
  let snapshot: RateSnapshot | null = null;
  let nextCheck = 0;
  let status: RateResult['status'] = 'unavailable';
  let pending: Promise<RateResult> | null = null;
  function result(): RateResult {
    snapshot = readRateSnapshot(snapshot, now());
    return { snapshot, status: snapshot ? status : 'unavailable' };
  }
  return async function getRates(): Promise<RateResult> {
    if (now() < nextCheck) return result();
    if (pending) return pending;
    pending = (async () => {
      if (!snapshot) {
        try { snapshot = readRateSnapshot(await cacheDeadline(store.load()), now()); } catch { /* Continue without cache. */ }
        if (snapshot && now() - snapshot.fetchedAt < FX_REFRESH_INTERVAL) {
          status = 'latest'; nextCheck = snapshot.fetchedAt + FX_REFRESH_INTERVAL; return result();
        }
      }
      try {
        const response = await request(URL, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(4000) });
        if (!response.ok) throw Error('Rates unavailable');
        const updated = parseEcbRates(await response.json(), now());
        if (!updated || (snapshot && updated.date < snapshot.date)) throw Error('Invalid or older rates');
        snapshot = updated; status = 'latest'; nextCheck = now() + FX_REFRESH_INTERVAL;
        try { await cacheDeadline(store.save(updated)); } catch { /* A cache write must not hide valid rates. */ }
      } catch {
        status = 'cached'; nextCheck = now() + 5 * 60_000;
      }
      return result();
    })().finally(() => { pending = null; });
    return pending;
  };
}

let schemaReady: Promise<void> | null = null;
async function database() {
  const db = getD1Binding();
  if (!schemaReady) schemaReady = db.prepare('CREATE TABLE IF NOT EXISTS currency_rate_cache (base TEXT PRIMARY KEY, snapshot_json TEXT NOT NULL, fetched_at INTEGER NOT NULL)').run()
    .then(() => {}).catch(error => { schemaReady = null; throw error; });
  await schemaReady; return db;
}
export const getReferenceRates = createRateService({
  async load() {
    const row = await (await database()).prepare("SELECT snapshot_json FROM currency_rate_cache WHERE base='USD'").first<{ snapshot_json: string }>();
    return row ? JSON.parse(row.snapshot_json) : null;
  },
  async save(snapshot) {
    await (await database()).prepare("INSERT INTO currency_rate_cache(base,snapshot_json,fetched_at) VALUES('USD',?,?) ON CONFLICT(base) DO UPDATE SET snapshot_json=excluded.snapshot_json,fetched_at=excluded.fetched_at WHERE excluded.fetched_at>=currency_rate_cache.fetched_at")
      .bind(JSON.stringify(snapshot), snapshot.fetchedAt).run();
  },
});

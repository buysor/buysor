"use client";
import { createContext, useContext, useEffect, useState } from 'react';
import { usePreferences } from './preferences-provider';
import { MarketSelector } from './market-selector';
import { FX_REFRESH_INTERVAL, FX_STORAGE_KEY, readRateSnapshot, servicePrice, type RateResult } from '@/lib/exchange-rates';
import styles from './currency-pricing.module.css';

type State = { snapshot: RateResult['snapshot']; status: RateResult['status'] | 'loading' };
const Context = createContext<State>({ snapshot: null, status: 'loading' });
export function CurrencyPricingProvider({ children }: { children: React.ReactNode }) {
  const { ready } = usePreferences();
  const [state, setState] = useState<State>({ snapshot: null, status: 'loading' });
  useEffect(() => {
    if (!ready) return;
    let active = true; let pending = false; let lastAttempt = 0;
    let lastGood: RateResult['snapshot'] = null;
    let controller: AbortController | null = null;
    try {
      const saved = readRateSnapshot(JSON.parse(localStorage.getItem(FX_STORAGE_KEY) || 'null'));
      if (saved) { lastGood = saved; setState({ snapshot: saved, status: 'cached' }); }
    } catch { /* Storage is optional. */ }
    async function refresh() {
      if (!active || pending || (lastAttempt && Date.now() - lastAttempt < 60_000)) return;
      pending = true; lastAttempt = Date.now(); controller = new AbortController();
      const timer = setTimeout(() => controller?.abort(), 6500);
      try {
        const response = await fetch('/api/currency/rates', { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw Error('Rates unavailable');
        const body = await response.json() as RateResult;
        const snapshot = readRateSnapshot(body.snapshot);
        if (!snapshot || !['latest', 'cached'].includes(body.status)) throw Error('Rates unavailable');
        if (readRateSnapshot(lastGood) && lastGood!.date > snapshot.date) throw Error('Older rates');
        if (!active) return;
        lastGood = snapshot;
        setState({ snapshot, status: body.status });
        try { localStorage.setItem(FX_STORAGE_KEY, JSON.stringify(snapshot)); } catch {}
      } catch {
        if (active) setState(current => {
          const snapshot = readRateSnapshot(current.snapshot);
          return { snapshot, status: snapshot ? 'cached' : 'unavailable' };
        });
      } finally { clearTimeout(timer); pending = false; }
    }
    const resume = () => { if (document.visibilityState === 'visible') void refresh(); };
    void refresh();
    const interval = setInterval(resume, 5 * 60_000);
    window.addEventListener('online', resume); window.addEventListener('focus', resume);
    document.addEventListener('visibilitychange', resume);
    return () => {
      active = false; controller?.abort(); clearInterval(interval);
      window.removeEventListener('online', resume); window.removeEventListener('focus', resume);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [ready]);
  return <Context.Provider value={state}>{children}</Context.Provider>;
}

export function useServicePricing() {
  const { currency, language } = usePreferences();
  const state = useContext(Context);
  const snapshot = readRateSnapshot(state.snapshot);
  return { ...state, snapshot, currency, price: (cents: number) => servicePrice(cents, currency, language, snapshot).text };
}

export function ServicePrice({ cents, showCharge = false }: { cents: number; showCharge?: boolean }) {
  const { language } = usePreferences();
  const { currency, snapshot } = useServicePricing();
  const price = servicePrice(cents, currency, language, snapshot);
  return <span className={showCharge ? styles.price : undefined} data-service-price={cents} data-price-currency={price.currency}>
    <span>{price.text}</span>
    {showCharge && price.currency !== 'USD' ? <small className={styles.charge}>{language === 'ko' ? '결제 기준' : 'Charged in'} {servicePrice(cents, 'USD', language, null).text}{language === 'ko' ? ' · 세금 별도' : ' · plus tax'}</small> : null}
  </span>;
}

export function ExchangeRateNotice() {
  const { language } = usePreferences(); const ko = language === 'ko';
  const { currency, snapshot, status } = useServicePricing();
  const cached = status === 'cached' || Boolean(snapshot && Date.now() - snapshot.fetchedAt > FX_REFRESH_INTERVAL);
  return <div className={styles.notice} data-rate-status={snapshot ? (cached ? 'cached' : status) : status === 'loading' ? 'loading' : 'unavailable'}>
    <MarketSelector />
    <p>{ko ? '환산 금액은 참고용이며 실제 결제는 USD입니다. 세금과 카드사 환율·수수료에 따라 최종 금액이 달라질 수 있습니다.' : 'Converted prices are estimates. Checkout charges USD; tax and your bank’s exchange rate or fees may change the final total.'}</p>
    {currency !== 'USD' ? <p role="status">{snapshot
      ? <>{cached ? (ko ? '마지막으로 확인한 환율 사용 중 · 자동 재확인 · ' : 'Using last available rates · retrying automatically · ') : null}{ko ? '환율 기준일' : 'Rate date'}: <time dateTime={snapshot.date}>{snapshot.date}</time> · {ko ? '영업일마다 갱신되는 ECB 기준 환율' : 'ECB reference rates, updated each business day'} · <a href="https://frankfurter.dev/" target="_blank" rel="noreferrer">Frankfurter</a></>
      : status === 'loading' ? (ko ? '환율 확인 중입니다. 확인 전에는 USD 가격을 표시합니다.' : 'Updating rates. USD prices are shown until conversion is available.')
      : (ko ? '환율 연결을 확인하지 못해 USD 가격을 표시합니다. 자동으로 다시 시도합니다.' : 'Conversion is unavailable. USD prices remain visible; we’ll retry automatically.')}</p> : null}
  </div>;
}

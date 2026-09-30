"use client";
import { usePreferences } from './preferences-provider';
import { MARKETS, isMarket } from '@/lib/market';
export function MarketSelector({ compact = false }: { compact?: boolean }) {
  const { market, setMarket, language } = usePreferences(); const ko = language === 'ko';
  return <label style={{ display: 'grid', gap: 7, minWidth: 0, fontSize: 12, color: 'var(--muted)' }}>
    <span>{ko ? '제품을 구매할 지역' : 'Shopping region'}</span>
    <select aria-label={ko ? '제품을 구매할 지역' : 'Shopping region'} value={market} onChange={event => { if (isMarket(event.target.value)) setMarket(event.target.value); }} style={{ width: '100%', minHeight: 40, padding: '0 10px', border: '1px solid var(--line)', borderRadius: 10, color: 'var(--ink)', background: 'var(--surface)' }}>
      {Object.entries(MARKETS).map(([key, value]) => <option key={key} value={key}>{ko ? value.ko : value.name} · {value.currency}</option>)}
    </select>
    {!compact ? <small>{ko ? '제품 예산·지역별 보증과 호환성에 적용됩니다. BUYSOR 요금은 USD입니다.' : 'Used for product budgets, regional warranty and compatibility. BUYSOR prices are in USD.'}</small> : null}
  </label>;
}

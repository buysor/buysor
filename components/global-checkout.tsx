"use client";
import { useEffect, useState } from 'react';
import { SiteShell } from './site-shell';
import { usePreferences } from './preferences-provider';
import { localizeError } from '@/lib/ui-locale';
import { formatUSD } from '@/lib/commerce-policy';
import styles from './commerce.module.css';
type Paddle = { Initialize(options:unknown):void; Checkout:{open(options:unknown):void} };
declare global { interface Window { Paddle?: Paddle } }
let loading: Promise<Paddle> | null = null; let initialized = false;
function loadPaddle() {
  if (!loading) loading = new Promise<Paddle>((resolve,reject) => {
    if (window.Paddle) return resolve(window.Paddle);
    const script = document.createElement('script'); script.src='https://cdn.paddle.com/paddle/v2/paddle.js';script.async=true;
    const timer=setTimeout(()=>{script.remove();reject(Error('Checkout could not load.'));},15000);
    script.onload=()=>{clearTimeout(timer);window.Paddle?resolve(window.Paddle):reject(Error('Checkout could not load.'));};
    script.onerror=()=>{clearTimeout(timer);script.remove();reject(Error('Checkout could not load.'));};document.head.append(script);
  }).catch(error=>{loading=null;throw error;}); return loading;
}
type Quote = {orderId:string;status:string;amount:number;credits:number;clientToken:string|null};
export function GlobalCheckout() {
  const {language,theme,ready}=usePreferences(); const ko=language==='ko';
  const [quote,setQuote]=useState<Quote|null>(null);const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  useEffect(()=>{
    if (!ready) return;
    const controller=new AbortController();const transaction=new URLSearchParams(location.search).get('_ptxn') || '';
    fetch(`/api/billing/checkout?transaction=${encodeURIComponent(transaction)}`,{cache:'no-store',signal:controller.signal}).then(async response=>{
      const body=await response.json();if(!response.ok)throw Error(localizeError(body.error,language,ko?'결제 정보를 확인하지 못했습니다.':'Could not verify checkout details.',body.code));return body as Quote;
    }).then(value=>{if(!controller.signal.aborted)setQuote(value);}).catch(reason=>{if(!controller.signal.aborted)setError(reason.message);});
    return()=>controller.abort();
  },[ready,language]);
  async function open() {
    if (!quote || busy) return; const transactionId=new URLSearchParams(location.search).get('_ptxn') || '';
    const successUrl=`${location.origin}/billing/success?orderId=${encodeURIComponent(quote.orderId)}&transactionId=${encodeURIComponent(transactionId)}`;
    if(quote.status==='paid'){location.assign(successUrl);return;}
    setBusy(true);setError('');
    try { if(!quote.clientToken?.startsWith('live_'))throw Error('Checkout is not available yet.');const paddle=await loadPaddle();
      if(!initialized){paddle.Initialize({token:quote.clientToken});initialized=true;}
      paddle.Checkout.open({transactionId,settings:{locale:language,theme,displayMode:'overlay',showAddDiscounts:false,successUrl}});
    }catch(reason){setError(reason instanceof Error?reason.message:(ko?'결제창을 열지 못했습니다.':'Could not open checkout.'));}finally{setBusy(false);}
  }
  return <SiteShell compact><main className={styles.return}><h1>{ko?'안전한 결제':'Secure checkout'}</h1>
    {quote?<><p>{quote.credits}C · {formatUSD(quote.amount,language)} USD</p><p>{ko?'해당 국가의 세금과 최종 결제 금액은 결제창에서 확인하세요.':'Review applicable tax and the final total in checkout.'}</p><button type="button" disabled={busy} onClick={()=>void open()}>{busy?(ko?'연결 중':'Opening checkout'):(ko?'결제창 열기':'Open checkout')}</button></>:!error?<p>{ko?'주문 확인 중':'Checking your order…'}</p>:null}
    {error?<p role="alert">{localizeError(error,language,ko?'결제창을 확인하지 못했습니다.':'Could not open checkout.')}</p>:null}<a href="/credits">{ko?'크레딧으로 돌아가기':'Back to credits'}</a><a href="/support">{ko?'고객지원':'Contact support'}</a>
  </main></SiteShell>;
}

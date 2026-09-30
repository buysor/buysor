"use client";
import { useEffect, useRef, useState } from 'react';
import { CREDIT_PACKS, POLICY_VERSION, formatKRW } from '@/lib/commerce-policy';
import s from './commerce.module.css';
import {usePreferences} from '@/components/preferences-provider';
import {trackEvent} from '@/lib/analytics-client';
import {localizeError} from '@/lib/ui-locale';
type Status={authenticated:boolean;checkoutReady:boolean;subscriptionReady:boolean;aiReady:boolean;balance:{available:number}|null};
export function useCommerce(){
 const [data,setData]=useState<Status|null>(null);const [error,setError]=useState('');
 useEffect(()=>{const ctrl=new AbortController();fetch('/api/commerce/status',{cache:'no-store',signal:ctrl.signal})
 .then(async r=>{if(!r.ok)throw Error('상태를 확인하지 못했습니다.');return r.json();}).then(setData)
 .catch(e=>{if(!ctrl.signal.aborted)setError(e.message);});return()=>ctrl.abort();},[]);
 const {language}=usePreferences();
 return {data,error:error?(language==='ko'?'상태를 확인하지 못했습니다.':'Could not check service status.'):''};
}
export function CheckoutButton({productId}:{productId:string}){
 const {language}=usePreferences();const ko=language==='ko';
 const {data,error}=useCommerce();const [consent,setConsent]=useState(false);const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const lock=useRef(false);
 const product=CREDIT_PACKS.find(p=>p.id===productId);if(!product)return null;
 async function start(){
  if(!product||lock.current||!consent||!data?.checkoutReady)return;
  if(!data.authenticated){trackEvent('checkout_started',{productId,authenticated:false,price:product.price});location.assign('/login?return_to=%2Fcredits');return;}
  trackEvent('checkout_started',{productId,authenticated:true,price:product.price});
  lock.current=true;setBusy(true);setMessage('');
  try{const r=await fetch('/api/billing/order',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({productId,acceptedPrice:product.price,policyVersion:POLICY_VERSION,consent:true})});const b=await r.json();if(!r.ok||!b.url)throw Error(localizeError(b.error,language,ko?'결제창을 열지 못했습니다.':'Could not open checkout.',b.code));location.assign(b.url);}
  catch(e){setMessage(e instanceof Error?e.message:(ko?'잠시 후 다시 시도해 주세요.':'Please try again shortly.'));lock.current=false;setBusy(false);}
 }
 return <div className={s.checkout}>
  {data?.checkoutReady?<label><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>{ko?`${formatKRW(product.price, language)} 단건 결제와 사용권 가이드를 확인했습니다.`:`I reviewed the ${formatKRW(product.price, language)} one-time purchase and credit policy.`}</span></label>:null}
  <button type="button" disabled={!data?.checkoutReady||busy||!consent} onClick={start}>{busy?(ko?'결제창 연결 중':'Opening checkout'):!data?(ko?'연결 확인 중':'Checking'):!data.checkoutReady?(ko?'결제 준비 중':'Checkout preparing'):data.authenticated?(ko?`${formatKRW(product.price, language)} 결제`:`Pay ${formatKRW(product.price, language)}`):(ko?'로그인 후 결제':'Sign in to pay')}</button>
  {(message||error)?<p role="alert">{localizeError(message||error,language,ko?"결제창을 열지 못했습니다.":"Could not open checkout.")}</p>:null}
 </div>;
}
export function CommerceNotice(){const {language}=usePreferences();const ko=language==='ko';const {data,error}=useCommerce();return <aside className={s.notice} role="status">
 {!data?error||(ko?'서비스 상태를 확인하고 있습니다.':'Checking service status.'):data.checkoutReady?(ko?'결제는 선택한 상품에만 진행됩니다. 자동 추가 충전은 하지 않습니다.':'Only the selected product is charged. There is no automatic top-up.'):(ko?'공개 준비 버전입니다. 결제와 실제 분석 검증을 마치기 전에는 요금을 청구하지 않습니다.':'Public preview. No charge is made before billing and analysis are fully verified.')}
 {data?.authenticated&&data.balance?<strong>{ko?'사용 가능':'Available'} {data.balance.available}C</strong>:null}
 </aside>;}
export function BillingReturn({failed=false}:{failed?:boolean}){
 const {language}=usePreferences();const ko=language==='ko';
 const [state,setState]=useState<{kind:'checking'|'missing'|'verified'|'error';credits?:number;message?:string;code?:string}>({kind:'checking'});const [retry,setRetry]=useState(0);const [canRetry,setCanRetry]=useState(false);
 useEffect(()=>{if(failed)return;const p=new URLSearchParams(location.search);const orderId=p.get('orderId'),paymentKey=p.get('paymentKey'),amount=Number(p.get('amount'));
 if(!orderId||!paymentKey||!Number.isSafeInteger(amount)||amount<=0){setState({kind:'missing'});return;}
 let active=true;setCanRetry(false);
 fetch('/api/billing/confirm',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({orderId,paymentKey,amount})}).then(async r=>{const b=await r.json();if(!r.ok){if(active){setState({kind:'error',message:b.error,code:b.code});setCanRetry(true);}return;}if(active){setState({kind:'verified',credits:b.credits});trackEvent('checkout_completed',{credits:Number(b.credits||0),amount});history.replaceState(null,'',location.pathname);}}).catch(e=>{if(active){setState({kind:'error',message:e.message});setCanRetry(true);}});return()=>{active=false;};},[failed,retry]);
 return <section className={s.return}><h1>{ko?'결제 확인':'Payment verification'}</h1><p role="status">{failed?(ko?'결제를 완료하지 않았습니다.':'Payment was not completed.'):state.kind==='missing'?(ko?'주문 정보가 없습니다. 결제 내역을 확인해 주세요.':'Order information is missing. Check billing history.'):state.kind==='verified'?(ko?`결제 확인 완료. ${state.credits}C가 지급되었습니다.`:`Payment verified. ${state.credits}C was added.`):state.kind==='error'?localizeError(state.message,language,ko?'결제 확인 실패':'Payment verification failed',state.code):(ko?'결제 상태를 서버에서 확인합니다.':'Checking payment status with the server.')}</p>{canRetry?<button onClick={()=>setRetry(v=>v+1)}>{ko?'같은 주문 다시 확인':'Retry same order'}</button>:null}<a href="/credits">{ko?'잔액과 내역 확인':'Check balance & history'}</a><a href="/support">{ko?'고객지원':'Support'}</a></section>;
}
type Order={id:string;product_id:string;amount:number;credits:number;status:string;created_at:number};
export function BillingHistory(){
 const {language}=usePreferences();const ko=language==='ko';
 const [items,setItems]=useState<Order[]>([]);const [note,setNote]=useState('');const [busy,setBusy]=useState('');
 const load=async()=>{try{const r=await fetch('/api/billing/history',{cache:'no-store'});if(r.status===401)return;if(!r.ok){setNote(ko?'내역을 불러오지 못했습니다.':'Could not load billing history.');return;}const b=await r.json();setItems(b.items??[]);}catch{setNote(ko?'내역을 불러오지 못했습니다.':'Could not load billing history.');}};
 useEffect(()=>{void load();},[ko]);
 async function refund(id:string){if(busy||!window.confirm(ko?'사용하지 않은 상품 전체에 대해 환불을 요청할까요?':'Request a refund for this entire unused purchase?'))return;setBusy(id);try{const r=await fetch('/api/billing/refund',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({orderId:id,confirmed:true})});const b=await r.json();setNote(r.ok?(ko?'환불 처리가 확인되었습니다.':'Your refund has been confirmed.'):localizeError(b.error,language,ko?'고객지원에 문의해 주세요.':'Please contact support.',b.code));await load();}catch{setNote(ko?'환불 상태를 확인하지 못했습니다. 같은 주문으로 다시 확인해 주세요.':'Could not verify the refund. Recheck the same order.');}finally{setBusy('');}}
 const labels:Record<string,string>=ko?{pending:'결제 대기',paid:'결제 완료',refund_pending:'환불 확인 중',refunded:'환불 완료',review:'확인 필요'}:{pending:'Payment pending',paid:'Paid',refund_pending:'Refund being verified',refunded:'Refunded',review:'Needs review'};
 return <section className={s.history}><h2>{ko?'결제 내역':'Billing history'}</h2>{!items.length?<p>{ko?'로그인한 계정의 주문만 표시합니다. 아직 표시할 내역이 없습니다.':'Only orders for the signed-in account are shown. No billing history yet.'}</p>:items.map(o=><article key={o.id}><div><strong>{o.credits}C · {formatKRW(o.amount, language)}</strong><small>{labels[o.status]??(ko?'확인 필요':'Needs review')} · {o.id}</small></div>{['paid','refund_pending'].includes(o.status)?<button disabled={Boolean(busy)} onClick={()=>void refund(o.id)}>{ko?'미사용 환불 확인':'Request unused refund'}</button>:null}</article>)}{note?<p role="status">{note==='환불 처리가 확인되었습니다.'||note==='Your refund has been confirmed.'?(ko?'환불 처리가 확인되었습니다.':'Your refund has been confirmed.'):localizeError(note,language,ko?'고객지원에 문의해 주세요.':'Could not verify billing status. Check the same order or contact support.')}</p>:null}<p>{ko?'사용 이력이 있거나 외부에서 결제가 취소된 경우 ':'If credits have been used or payment was cancelled externally, contact '}<a href="/support">{ko?'고객지원':'support'}</a>{ko?'에서 확인합니다.':' for review.'}</p></section>;
}

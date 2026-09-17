"use client";
import { useEffect, useRef, useState } from 'react';
import { CREDIT_PACKS, POLICY_VERSION, formatKRW } from '@/lib/commerce-policy';
import s from './commerce.module.css';
type Status={authenticated:boolean;checkoutReady:boolean;subscriptionReady:boolean;aiReady:boolean;balance:{available:number}|null};
export function useCommerce(){
 const [data,setData]=useState<Status|null>(null);const [error,setError]=useState('');
 useEffect(()=>{const ctrl=new AbortController();fetch('/api/commerce/status',{cache:'no-store',signal:ctrl.signal})
 .then(async r=>{if(!r.ok)throw Error('상태를 확인하지 못했습니다.');return r.json();}).then(setData)
 .catch(e=>{if(!ctrl.signal.aborted)setError(e.message);});return()=>ctrl.abort();},[]);
 return {data,error};
}
export function CheckoutButton({productId}:{productId:string}){
 const {data,error}=useCommerce();const [consent,setConsent]=useState(false);const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const lock=useRef(false);
 const product=CREDIT_PACKS.find(p=>p.id===productId);if(!product)return null;
 async function start(){
  if(!product||lock.current||!consent||!data?.checkoutReady)return;
  if(!data.authenticated){location.assign('/login?return_to=%2Fcredits');return;}
  lock.current=true;setBusy(true);setMessage('');
  try{const r=await fetch('/api/billing/order',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({productId,acceptedPrice:product.price,policyVersion:POLICY_VERSION,consent:true})});const b=await r.json();if(!r.ok||!b.url)throw Error(b.error||'결제창을 열지 못했습니다.');location.assign(b.url);}
  catch(e){setMessage(e instanceof Error?e.message:'잠시 후 다시 시도해 주세요.');lock.current=false;setBusy(false);}
 }
 return <div className={s.checkout}>
  {data?.checkoutReady?<label><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>{formatKRW(product.price)} 단건 결제와 사용권 가이드를 확인했습니다.</span></label>:null}
  <button type="button" disabled={!data?.checkoutReady||busy||!consent} onClick={start}>{busy?'결제창 연결 중':!data?'연결 확인 중':!data.checkoutReady?'결제 준비 중':data.authenticated?`${formatKRW(product.price)} 결제`:'로그인 후 결제'}</button>
  {(message||error)?<p role="alert">{message||error}</p>:null}
 </div>;
}
export function CommerceNotice(){const {data,error}=useCommerce();return <aside className={s.notice} role="status">
 {!data?error||'서비스 상태를 확인하고 있습니다.':data.checkoutReady?'결제는 선택한 상품에만 진행됩니다. 자동 추가 충전은 하지 않습니다.':'공개 준비 버전입니다. 결제와 실제 분석 검증을 마치기 전에는 요금을 청구하지 않습니다.'}
 {data?.authenticated&&data.balance?<strong>사용 가능 {data.balance.available}C</strong>:null}
 </aside>;}
export function BillingReturn({failed=false}:{failed?:boolean}){
 const [state,setState]=useState(failed?'결제를 완료하지 않았습니다.':'결제 상태를 서버에서 확인합니다.');const [retry,setRetry]=useState(0);const [canRetry,setCanRetry]=useState(false);
 useEffect(()=>{if(failed)return;const p=new URLSearchParams(location.search);const orderId=p.get('orderId'),paymentKey=p.get('paymentKey'),amount=Number(p.get('amount'));
 if(!orderId||!paymentKey||!Number.isSafeInteger(amount)||amount<=0){setState('주문 정보가 없습니다. 결제 내역을 확인해 주세요.');return;}
 let active=true;setCanRetry(false);
 fetch('/api/billing/confirm',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({orderId,paymentKey,amount})}).then(async r=>{const b=await r.json();if(!r.ok)throw Error(b.error||'결제 확인 실패');if(active){setState(`결제 확인 완료. ${b.credits}C가 지급되었습니다.`);history.replaceState(null,'',location.pathname);}}).catch(e=>{if(active){setState(e.message);setCanRetry(true);}});return()=>{active=false;};},[failed,retry]);
 return <section className={s.return}><h1>결제 확인</h1><p role="status">{state}</p>{canRetry?<button onClick={()=>setRetry(v=>v+1)}>같은 주문 다시 확인</button>:null}<a href="/credits">잔액과 내역 확인</a><a href="/support">고객지원</a></section>;
}
type Order={id:string;product_id:string;amount:number;credits:number;status:string;created_at:number};
export function BillingHistory(){
 const [items,setItems]=useState<Order[]>([]);const [note,setNote]=useState('');const [busy,setBusy]=useState('');
 const load=async()=>{try{const r=await fetch('/api/billing/history',{cache:'no-store'});if(r.status===401)return;if(!r.ok){setNote('내역을 불러오지 못했습니다.');return;}const b=await r.json();setItems(b.items??[]);}catch{setNote("내역을 불러오지 못했습니다.");}};
 useEffect(()=>{void load();},[]);
 async function refund(id:string){if(busy||!window.confirm('사용하지 않은 상품 전체에 대해 환불을 요청할까요?'))return;setBusy(id);try{const r=await fetch('/api/billing/refund',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({orderId:id,confirmed:true})});const b=await r.json();setNote(r.ok?'환불 처리가 확인되었습니다.':b.error||'고객지원에 문의해 주세요.');await load();}catch{setNote('환불 상태를 확인하지 못했습니다. 같은 주문으로 다시 확인해 주세요.');}finally{setBusy('');}}
 const labels:Record<string,string>={pending:'결제 대기',paid:'결제 완료',refund_pending:'환불 확인 중',refunded:'환불 완료',review:'확인 필요'};
 return <section className={s.history}><h2>결제 내역</h2>{!items.length?<p>로그인한 계정의 주문만 표시합니다. 아직 표시할 내역이 없습니다.</p>:items.map(o=><article key={o.id}><div><strong>{o.credits}C · {formatKRW(o.amount)}</strong><small>{labels[o.status]??'확인 필요'} · {o.id}</small></div>{['paid','refund_pending'].includes(o.status)?<button disabled={Boolean(busy)} onClick={()=>void refund(o.id)}>미사용 환불 확인</button>:null}</article>)}{note?<p role="status">{note}</p>:null}<p>사용 이력이 있거나 외부에서 결제가 취소된 경우 <a href="/support">고객지원</a>에서 확인합니다.</p></section>;
}

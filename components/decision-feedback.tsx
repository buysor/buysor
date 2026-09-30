"use client";
import { useState } from "react";
import { usePreferences } from "@/components/preferences-provider";
import { parseMoney } from "@/lib/market";
import { trackEvent } from "@/lib/analytics-client";

export function DecisionFeedback({decisionId,ko}:{decisionId:string;ko:boolean}){
 const {currency}=usePreferences();
 const [rating,setRating]=useState(0);const [saved,setSaved]=useState(false);const [openOutcome,setOpenOutcome]=useState(false);
 const [status,setStatus]=useState<"bought"|"waiting"|"not_bought">("bought");const [price,setPrice]=useState("");const [satisfaction,setSatisfaction]=useState(0);const [note,setNote]=useState("");const [message,setMessage]=useState("");
 async function helpful(value:number){setRating(value);setMessage("");try{const r=await fetch("/api/feedback",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({kind:"helpfulness",decisionId,rating:value})});if(!r.ok)throw Error();setSaved(true);trackEvent("feedback_submitted",{kind:"helpfulness",rating:value});}catch{setMessage(ko?"저장하지 못했습니다.":"Could not save feedback.");}}
 async function outcome(){setMessage("");const purchasePrice=status==="bought"&&price?parseMoney(price,currency):null;if(status==="bought"&&price&&(purchasePrice===null||!Number.isSafeInteger(purchasePrice)||purchasePrice<0)){setMessage(ko?"구매 가격을 확인해 주세요.":"Check the purchase price.");return;}try{const r=await fetch("/api/feedback",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({kind:"outcome",decisionId,status,purchasePrice,currency,satisfaction:status==="bought"&&satisfaction?satisfaction:null,wouldChooseAgain:null,note:note.trim()||undefined})});if(!r.ok)throw Error();setMessage(ko?"구매 결과를 저장했습니다.":"Purchase outcome saved.");trackEvent("feedback_submitted",{kind:"outcome",status,satisfaction});setOpenOutcome(false);}catch{setMessage(ko?"구매 결과를 저장하지 못했습니다.":"Could not save the purchase outcome.");}}
 return <article style={{border:"1px solid var(--line)",borderRadius:16,padding:16,display:"grid",gap:12}}>
  <div><strong style={{fontSize:13}}>{ko?"이 판단이 결정에 얼마나 도움됐나요?":"How helpful was this decision?"}</strong><p style={{margin:"5px 0 0",fontSize:10,color:"var(--muted)"}}>{ko?"실제 판단 품질 개선에 반영합니다.":"Used to improve real decision quality."}</p></div>
  <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{[1,2,3,4,5].map(v=><button key={v} type="button" onClick={()=>void helpful(v)} aria-pressed={rating===v} style={{minWidth:40,minHeight:36,border:"1px solid var(--line)",borderRadius:10,background:rating===v?"var(--blue)":"var(--surface)",color:rating===v?"#fff":"var(--ink)",fontWeight:800,cursor:"pointer"}}>{v}</button>)}</div>
  {saved?<small style={{color:"var(--muted)"}}>{ko?"저장됨":"Saved"}</small>:null}
  <button type="button" onClick={()=>setOpenOutcome(v=>!v)} style={{justifySelf:"start",border:0,background:"transparent",color:"var(--blue)",fontWeight:800,cursor:"pointer",padding:0}}>{ko?"실제로 샀는지 기록하기 →":"Record what actually happened →"}</button>
  {openOutcome?<div style={{display:"grid",gap:9,paddingTop:4}}>
   <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{([["bought",ko?"구매함":"Bought"],["waiting",ko?"아직 기다리는 중":"Still waiting"],["not_bought",ko?"구매 안 함":"Did not buy"]] as const).map(([v,l])=><button type="button" key={v} onClick={()=>setStatus(v)} aria-pressed={status===v} style={{padding:"9px 11px",border:"1px solid var(--line)",borderRadius:10,background:status===v?"var(--surface)":"var(--canvas)",fontWeight:750,cursor:"pointer"}}>{l}</button>)}</div>
   {status==="bought"?<><input inputMode={currency==="KRW"?"numeric":"decimal"} value={price} onChange={e=>setPrice(e.target.value.slice(0,12))} placeholder={ko?`실제 구매가 (${currency}) · 선택`:`Actual purchase price (${currency}) · optional`} style={{minHeight:40,border:"1px solid var(--line)",borderRadius:10,padding:"0 11px",background:"var(--canvas)",color:"var(--ink)"}}/><div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap"}}><span style={{fontSize:10,color:"var(--muted)"}}>{ko?"구매 후 만족도":"Satisfaction"}</span>{[1,2,3,4,5].map(v=><button type="button" key={v} onClick={()=>setSatisfaction(v)} style={{width:34,height:32,border:"1px solid var(--line)",borderRadius:9,background:satisfaction===v?"var(--blue)":"var(--surface)",color:satisfaction===v?"#fff":"var(--ink)",fontWeight:800}}>{v}</button>)}</div></>:null}
   <textarea value={note} onChange={e=>setNote(e.target.value.slice(0,1200))} placeholder={ko?"왜 샀거나 안 샀는지, 실제 결과가 어땠는지(선택)":"Why you bought or skipped it, and what happened (optional)"} style={{minHeight:76,border:"1px solid var(--line)",borderRadius:10,padding:10,background:"var(--canvas)",color:"var(--ink)",resize:"vertical"}}/>
   <button type="button" onClick={()=>void outcome()} style={{minHeight:40,border:0,borderRadius:10,background:"var(--ink)",color:"var(--canvas)",fontWeight:850,cursor:"pointer"}}>{ko?"결과 저장":"Save outcome"}</button>
  </div>:null}
  {message?<small role="status" style={{color:"var(--muted)"}}>{message}</small>:null}
 </article>;
}

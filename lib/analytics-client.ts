"use client";

type Primitive = string | number | boolean | null;
type Properties = Record<string, Primitive>;

const VISITOR_KEY="buysor-analytics-visitor-v1";
const SESSION_KEY="buysor-analytics-session-v1";
const ATTR_KEY="buysor-analytics-attribution-v1";

export function trackEvent(name:string, properties:Properties={}) {
  if(typeof window==="undefined") return;
  try {
    const visitorId=getOrCreate(localStorage,VISITOR_KEY);
    const sessionId=getOrCreate(sessionStorage,SESSION_KEY);
    const attribution=getAttribution();
    const payload={
      id:crypto.randomUUID(),visitorId,sessionId,name,path:location.pathname+location.search,
      referrerHost:referrerHost(),...attribution,device:deviceClass(),language:document.documentElement.lang||"en",
      properties:cleanProperties(properties),
    };
    void fetch("/api/analytics/event",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload),keepalive:true}).catch(()=>{});
  } catch {}
}

export function trackHeartbeat(){trackEvent("session_heartbeat");}

function getOrCreate(storage:Storage,key:string) {
  const existing=storage.getItem(key);
  if(existing && /^[0-9a-f-]{36}$/i.test(existing)) return existing;
  const value=crypto.randomUUID();storage.setItem(key,value);return value;
}
function getAttribution() {
  const current=new URLSearchParams(location.search);
  let saved:Record<string,string|null>={};
  try { saved=JSON.parse(localStorage.getItem(ATTR_KEY)||"{}") as Record<string,string|null>; } catch {}
  const next={
    utmSource:clip(current.get("utm_source")||saved.utmSource),
    utmMedium:clip(current.get("utm_medium")||saved.utmMedium),
    utmCampaign:clip(current.get("utm_campaign")||saved.utmCampaign),
    utmContent:clip(current.get("utm_content")||saved.utmContent),
    utmTerm:clip(current.get("utm_term")||saved.utmTerm),
  };
  if(Object.values(next).some(Boolean)) try{localStorage.setItem(ATTR_KEY,JSON.stringify(next));}catch{}
  return next;
}
function referrerHost(){try{return document.referrer?new URL(document.referrer).hostname.slice(0,255):null;}catch{return null;}}
function deviceClass() {
  const ua=navigator.userAgent.toLowerCase();
  if(/ipad|tablet/.test(ua)) return "tablet";
  if(/mobi|iphone|android/.test(ua)) return "mobile";
  return "desktop";
}
function clip(value:string|null|undefined){return value?value.trim().slice(0,160):null;}
function cleanProperties(input:Properties) {
  const output:Properties={};
  for(const [key,value] of Object.entries(input).slice(0,20)){
    const safeKey=key.replace(/[^a-zA-Z0-9_.-]/g,"").slice(0,60);
    if(!safeKey)continue;
    output[safeKey]=typeof value==="string"?value.slice(0,500):value;
  }
  return output;
}


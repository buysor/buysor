"use client";
import {useEffect,useState} from 'react';
import {SiteShell} from '@/components/site-shell';
import {usePreferences} from '@/components/preferences-provider';
import {localizeError} from '@/lib/ui-locale';
import s from '@/components/commerce.module.css';
type Summary={today:string;checkedToday:boolean;streak:number;timeZone?:string;week:Array<{date:string;checked:boolean;isToday:boolean;weekday:string;day:number}>};
export function AttendanceClient(){const {language,timeZone,ready}=usePreferences();const ko=language==='ko';const [data,setData]=useState<Summary|null>(null);const [note,setNote]=useState('');const [busy,setBusy]=useState(false);
 async function load(){try{const r=await fetch(`/api/attendance?timeZone=${encodeURIComponent(timeZone)}`,{cache:'no-store'});if(r.status===401){setNote(ko?'로그인하면 출석을 기록할 수 있습니다.':'Sign in to record your visit.');return;}if(!r.ok)throw Error();setData(await r.json());}catch{setNote(ko?'출석 기록을 불러오지 못했습니다.':'Could not load attendance history.');}}
 useEffect(()=>{if(ready)void load();},[ko,timeZone,ready]);
 async function check(){if(busy)return;setBusy(true);try{const r=await fetch(`/api/attendance?timeZone=${encodeURIComponent(timeZone)}`,{method:'POST',headers:{'content-type':'application/json'},body:'{}'});const b=await r.json();if(!r.ok)throw Error(localizeError(b.error,language,ko?'출석 처리 실패':'Could not record attendance',b.code));setData(b);setNote(ko?'오늘 방문을 기록했습니다.':'Today\'s visit was recorded.');}catch(e){setNote(e instanceof Error?e.message:(ko?'다시 확인해 주세요.':'Please try again.'));}finally{setBusy(false);}}
 return <SiteShell compact><main className={s.return}><span>BUYSOR</span><h1>{ko?'출석 기록':'Daily check-in'}</h1><p>{ko?'방문을 기록합니다. 가입·출석·룰렛으로 자동 크레딧을 지급하지 않습니다.':'Record visits. Sign-up, attendance and roulette do not automatically grant AI credits.'}</p>{data?<><strong>{data.streak} {ko?'일 연속 방문':'day streak'}</strong><p>{data.today} · {data.timeZone||timeZone}</p><button disabled={busy||data.checkedToday} onClick={()=>void check()}>{data.checkedToday?(ko?'오늘 기록 완료':'Recorded today'):busy?(ko?'처리 중':'Saving'):(ko?'오늘 출석 기록':'Record today')}</button></>:<a href="/login?return_to=%2Fattendance">{ko?'Google 로그인':'Sign in with Google'}</a>}<p role="status">{note?(note==='오늘 방문을 기록했습니다.'||note==="Today's visit was recorded."?(ko?'오늘 방문을 기록했습니다.':"Today's visit was recorded."):localizeError(note,language,ko?'출석 기록을 불러오지 못했습니다.':'Could not load attendance history.')) : ''}</p><a href="/my">{ko?'내 바이저':'My BUYSOR'}</a><a href="/credits">{ko?'크레딧 안내':'Credits'}</a></main></SiteShell>;
}


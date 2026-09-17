"use client";
import {useEffect,useState} from 'react';
import {SiteShell} from '@/components/site-shell';
import s from '@/components/commerce.module.css';
type Summary={today:string;checkedToday:boolean;streak:number;week:Array<{date:string;checked:boolean;isToday:boolean;weekday:string;day:number}>};
export function AttendanceClient(){const [data,setData]=useState<Summary|null>(null);const [note,setNote]=useState('');const [busy,setBusy]=useState(false);
 async function load(){try{const r=await fetch('/api/attendance',{cache:'no-store'});if(r.status===401){setNote('로그인하면 출석을 기록할 수 있습니다.');return;}if(!r.ok)throw Error();setData(await r.json());}catch{setNote('출석 기록을 불러오지 못했습니다.');}}
 useEffect(()=>{void load();},[]);
 async function check(){if(busy)return;setBusy(true);try{const r=await fetch('/api/attendance',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});const b=await r.json();if(!r.ok)throw Error(b.error||'출석 처리 실패');setData(b);setNote('오늘 방문을 기록했습니다.');}catch(e){setNote(e instanceof Error?e.message:'다시 확인해 주세요.');}finally{setBusy(false);}}
 return <SiteShell compact><main className={s.return}><span>BUYSOR</span><h1>출석 기록</h1><p>방문을 기록합니다. 가입·출석·룰렛으로 자동 크레딧을 지급하지 않습니다.</p>{data?<><strong>{data.streak}일 연속 방문</strong><p>{data.today} · 한국 시간 기준</p><button disabled={busy||data.checkedToday} onClick={()=>void check()}>{data.checkedToday?'오늘 기록 완료':busy?'처리 중':'오늘 출석 기록'}</button></>:<a href="/login?return_to=%2Fattendance">Google 로그인</a>}<p role="status">{note}</p><a href="/my">내 바이저</a><a href="/credits">크레딧 안내</a></main></SiteShell>;
}

"use client";
import { useEffect } from "react";
import { trackEvent, trackHeartbeat } from "@/lib/analytics-client";

export function AnalyticsTracker() {
  useEffect(() => {
    let last="";
    const trackPage=()=>{
      const key=location.pathname+location.search;
      if(key===last)return;
      last=key;
      trackEvent("page_view",{title:document.title.slice(0,180)});
    };
    trackPage();

    const onRoute=()=>queueMicrotask(trackPage);
    const push=history.pushState.bind(history);
    const replace=history.replaceState.bind(history);
    history.pushState=(...args)=>{push(...args);window.dispatchEvent(new Event("buysor-route"));};
    history.replaceState=(...args)=>{replace(...args);window.dispatchEvent(new Event("buysor-route"));};
    window.addEventListener("popstate",onRoute);
    window.addEventListener("buysor-route",onRoute);

    const heartbeat=window.setInterval(()=>{if(document.visibilityState==="visible")trackHeartbeat();},120_000);
    const visibility=()=>{if(document.visibilityState==="visible")trackHeartbeat();};
    document.addEventListener("visibilitychange",visibility);

    return ()=>{
      history.pushState=push;history.replaceState=replace;
      window.removeEventListener("popstate",onRoute);window.removeEventListener("buysor-route",onRoute);
      document.removeEventListener("visibilitychange",visibility);window.clearInterval(heartbeat);
    };
  },[]);
  return null;
}

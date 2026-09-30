import { getChatGPTUser } from "@/app/chatgpt-auth";
import { assertAdminUser } from "@/lib/admin";
import { getAdminSegmentAnalytics } from "@/lib/analytics-store";
import { errorResponse, json, PublicError } from "@/lib/request-safety";

export const dynamic="force-dynamic";
export async function GET(request:Request){
  try{
    assertAdminUser(await getChatGPTUser());
    const url=new URL(request.url);
    const raw=Number(url.searchParams.get("days")||7);
    const days=[1,7,30,90].includes(raw)?raw:7;
    const source=clip(url.searchParams.get("source"),120);
    const device=clip(url.searchParams.get("device"),20);
    const country=clip(url.searchParams.get("country"),2);
    const language=clip(url.searchParams.get("language"),12);
    if(device && !["desktop","mobile","tablet","unknown"].includes(device))throw new PublicError(400,"INVALID_DEVICE","기기 필터를 확인해 주세요.");
    return json(await getAdminSegmentAnalytics({days,source,device,country,language}));
  }catch(error){return errorResponse(error);}
}
function clip(value:string|null,max:number){return value?.trim().slice(0,max)||null;}

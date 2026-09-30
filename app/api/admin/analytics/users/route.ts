import { getChatGPTUser } from "@/app/chatgpt-auth";
import { assertAdminUser } from "@/lib/admin";
import { findAdminUsers, getAdminUserJourney } from "@/lib/analytics-store";
import { errorResponse, json, PublicError } from "@/lib/request-safety";

export const dynamic="force-dynamic";
export async function GET(request:Request){
  try{
    assertAdminUser(await getChatGPTUser());
    const url=new URL(request.url);
    const email=url.searchParams.get("email")?.trim();
    const limit=Math.max(1,Math.min(100,Number(url.searchParams.get("limit")||20)));
    if(email){
      if(email.length>200)throw new PublicError(400,"INVALID_EMAIL","이메일을 확인해 주세요.");
      return json({journey:await getAdminUserJourney(email,limit)});
    }
    const q=(url.searchParams.get("q")||"").trim().slice(0,120);
    if(q.length<2)throw new PublicError(400,"QUERY_TOO_SHORT","검색어를 2자 이상 입력해 주세요.");
    return json({users:await findAdminUsers(q,limit)});
  }catch(error){return errorResponse(error);}
}

import { getChatGPTUser } from "@/app/chatgpt-auth";
import { assertAdminUser } from "@/lib/admin";
import { getAdminTimeSeries } from "@/lib/analytics-store";
import { errorResponse, json } from "@/lib/request-safety";

export const dynamic="force-dynamic";
export async function GET(request:Request){
  try{
    assertAdminUser(await getChatGPTUser());
    const raw=Number(new URL(request.url).searchParams.get("days")||7);
    const days=[1,7,30,90].includes(raw)?raw:7;
    return json({days,series:await getAdminTimeSeries(days)});
  }catch(error){return errorResponse(error);}
}

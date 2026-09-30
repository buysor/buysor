import { z } from "zod";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { ensureUserRecord } from "@/lib/user-data";
import { recordAnalyticsEvent } from "@/lib/analytics-store";
import { assertSameOrigin, boundedJson, errorResponse, json, PublicError } from "@/lib/request-safety";

export const dynamic = "force-dynamic";

const names = [
  "page_view","session_heartbeat","lens_input","advisor_completed","decision_started","decision_completed",
  "decision_failed","profile_saved","feedback_submitted","checkout_started","checkout_completed",
] as const;

const schema = z.object({
  id:z.string().uuid(), visitorId:z.string().uuid(), sessionId:z.string().uuid(),
  name:z.enum(names), path:z.string().trim().min(1).max(500),
  referrerHost:z.string().trim().max(255).nullable().optional(),
  utmSource:z.string().trim().max(120).nullable().optional(), utmMedium:z.string().trim().max(120).nullable().optional(),
  utmCampaign:z.string().trim().max(160).nullable().optional(), utmContent:z.string().trim().max(160).nullable().optional(),
  utmTerm:z.string().trim().max(160).nullable().optional(),
  device:z.enum(["desktop","mobile","tablet","unknown"]).default("unknown"),
  language:z.string().trim().max(12).default("ko"),
  properties:z.record(z.union([z.string().max(500),z.number().finite(),z.boolean(),z.null()])).default({}),
}).strict();

export async function POST(request:Request) {
  try {
    assertSameOrigin(request);
    const parsed=schema.safeParse(await boundedJson(request,12_000));
    if(!parsed.success) throw new PublicError(400,"INVALID_ANALYTICS_EVENT","분석 이벤트 형식을 확인해 주세요.");
    const body=parsed.data;
    if(!body.path.startsWith("/") || body.path.startsWith("//")) throw new PublicError(400,"INVALID_ANALYTICS_PATH","경로를 확인해 주세요.");
    const propertiesJson=JSON.stringify(body.properties);
    if(propertiesJson.length>3000) throw new PublicError(413,"ANALYTICS_PROPERTIES_TOO_LARGE","이벤트 정보가 너무 큽니다.");

    const user=await getChatGPTUser();
    if(user) await ensureUserRecord(user);
    const country=readCountry(request);

    await recordAnalyticsEvent({
      id:body.id,visitorId:body.visitorId,sessionId:body.sessionId,name:body.name,path:body.path,
      referrerHost:body.referrerHost??null,utmSource:body.utmSource??null,utmMedium:body.utmMedium??null,
      utmCampaign:body.utmCampaign??null,utmContent:body.utmContent??null,utmTerm:body.utmTerm??null,
      device:body.device,language:body.language,propertiesJson,userId:user?.id??null,country,
    });
    return json({ok:true});
  } catch(error) { return errorResponse(error); }
}

function readCountry(request:Request) {
  const country=(request as Request & {cf?:{country?:string}}).cf?.country?.toUpperCase();
  return country && /^[A-Z]{2}$/.test(country) ? country : null;
}

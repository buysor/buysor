import {costMicroUSD, FEATURES, type Feature} from './commerce-policy';
import {runtimeConfig} from './commerce-runtime';
import {PublicError} from './request-safety';
import type {
  DecisionAnswers,
  DecisionDraft,
  DecisionResult,
  StructuredUserState,
  UserModelPayload,
} from "@/lib/buysor-types";

export type AiProvider = "openai" | "anthropic";

export type AiRuntimeStatus = {
  configured: boolean;
  provider: AiProvider | null;
  model: string | null;
};

type JsonSchema = Record<string, unknown>;

type AiCall = {
  schemaName: string;
  schema: JsonSchema;
  system: string;
  user: string;
  imageDataUrl?: string;
  maxTokens?: number;
  reserveMicro: number;
  onUsage: (usage:{micro:number;input:number;output:number;providerId:string})=>Promise<void>;
};

const userStateSchema: JsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    currentProduct: { type: ["string", "null"] },
    painPoint: { type: ["string", "null"] },
    comfortableBudget: { type: ["string", "null"] },
    maximumBudget: { type: ["string", "null"] },
    usedAccepted: { type: ["boolean", "null"] },
    urgency: { type: ["string", "null"] },
    expectedUsePeriod: { type: ["string", "null"] },
    environment: { type: ["string", "null"] },
    futurePlan: { type: ["string", "null"] },
    mustHaves: { type: "array", items: { type: "string" } },
    avoid: { type: "array", items: { type: "string" } },
    uncertainties: { type: "array", items: { type: "string" } },
  },
  required: [
    "currentProduct",
    "painPoint",
    "comfortableBudget",
    "maximumBudget",
    "usedAccepted",
    "urgency",
    "expectedUsePeriod",
    "environment",
    "futurePlan",
    "mustHaves",
    "avoid",
    "uncertainties",
  ],
};

const decisionSchema: JsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    verdict: { type: "string", enum: ["BUY", "WAIT", "SKIP"] },
    headline: { type: "string" },
    summary: { type: "string" },
    confidence: { type: "number", minimum: 0, maximum: 100 },
    topPick: {
      anyOf: [
        { type: "null" },
        {
          type: "object",
          additionalProperties: false,
          properties: {
            name: { type: "string" },
            why: { type: "string" },
            targetPrice: { type: ["string", "null"] },
            condition: { type: ["string", "null"] },
          },
          required: ["name", "why", "targetPrice", "condition"],
        },
      ],
    },
    reasons: { type: "array", minItems: 2, maxItems: 6, items: { type: "string" } },
    tradeoffs: { type: "array", maxItems: 6, items: { type: "string" } },
    alternatives: {
      type: "array",
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          whenBetter: { type: "string" },
          reason: { type: "string" },
        },
        required: ["name", "whenBetter", "reason"],
      },
    },
    waitFor: { type: ["string", "null"] },
    avoid: { type: "array", maxItems: 6, items: { type: "string" } },
    missingInformation: { type: "array", maxItems: 6, items: { type: "string" } },
    userModelUsed: { type: "array", maxItems: 10, items: { type: "string" } },
    recheckAt: { type: ["string", "null"] },
  },
  required: [
    "verdict",
    "headline",
    "summary",
    "confidence",
    "topPick",
    "reasons",
    "tradeoffs",
    "alternatives",
    "waitFor",
    "avoid",
    "missingInformation",
    "userModelUsed",
    "recheckAt",
  ],
};

const BUYSOR_SYSTEM = `You are BUYSOR, an AI purchase decision engine.
Your job is not to generate a long recommendation list. Decide whether the user should BUY, WAIT, or SKIP first.
Use the user's budget, actual use, current products, environment, past purchase experience, risk tolerance, timing, future plans, expected ownership period, resale value, new-vs-used openness, and any category-specific constraints.
Never invent a model, price, release date, warranty fact, resale price, condition, or compatibility fact that is not supported by the supplied context.
If current market facts are missing, identify the missing information instead of pretending it is known.
The supplied URLs are unverified user references, not retrieved pages. There is no live web search in this task. Never claim to have searched or checked a current price. Clearly label this evidence boundary. A BUY verdict may include one top pick only when enough evidence exists. If evidence is insufficient, set topPick to null and explain what must be checked.
WAIT must state what event, price, timing, or information should trigger a re-check. SKIP must explain why buying is unnecessary or harmful right now.
Provide three meaningful scenarios where evidence permits: keep current product, buy a suitable new product, consider used or wait. Do not fabricate product names to meet a count. State trade-offs clearly. Do not optimize for affiliate conversion. Optimize for user fit and avoiding unnecessary purchases.
Write all user-facing text in Korean unless the supplied language is English.`;

export function getAiRuntimeStatus(): AiRuntimeStatus {
 const config=runtimeConfig();return {configured:config.configured,provider:config.configured?'openai':null,model:config.model};
}

export async function generateDecision(input: {
  draft: DecisionDraft;
  answers: DecisionAnswers;
  userModel: UserModelPayload | null;
  feature?: Feature;
  reserveMicro: number;
  onUsage: (usage:{micro:number;input:number;output:number;providerId:string})=>Promise<void>;
}): Promise<DecisionResult> {
  const payload = {
    productInput: {
      type: input.draft.type,
      value: input.draft.value,
      note: input.draft.note ?? "",
      categoryId: input.draft.categoryId ?? null,
      subcategoryId: input.draft.subcategoryId ?? null,
      imageName: input.draft.imageName ?? null,
    },
    answers: input.answers,
    userModel: input.userModel,
  };

  const result = await callJson<DecisionResult>({
    schemaName: "buysor_decision",
    schema: decisionSchema,
    system: BUYSOR_SYSTEM,
    user: `다음 입력을 바탕으로 구매 판단을 생성하세요. 제공되지 않은 현재 시세·출시 정보·실재 모델 정보는 만들어내지 마세요.\n\n${JSON.stringify(payload, null, 2)}`,
    imageDataUrl: input.draft.imageDataUrl,
    maxTokens: FEATURES[input.feature ?? 'standard'].maxOutput,
    reserveMicro: input.reserveMicro,
    onUsage: input.onUsage,
  });

  return sanitizeDecision(result);
}


async function callJson<T>(call: AiCall): Promise<T> {
 const status=getAiRuntimeStatus();if(!status.configured||!status.model)throw new AiNotConfiguredError();
 const model=status.model;
 // A deliberately conservative preflight bound; no automatic retries or paid tools.
 const textBytes=new TextEncoder().encode(call.system+call.user+JSON.stringify(call.schema)).byteLength;
 const upperInput=textBytes+4096+(call.imageDataUrl?8192:0);
 const upper=costMicroUSD(model,upperInput,call.maxTokens??2800);
 if(upper>call.reserveMicro)throw new PublicError(413,'ANALYSIS_BUDGET_EXCEEDED','입력을 줄이거나 심층 판단을 선택해 주세요. 크레딧은 복원됩니다.');
 const content: Array<Record<string,unknown>>=[{type:'input_text',text:call.user}];
 if(call.imageDataUrl)content.unshift({type:'input_image',image_url:call.imageDataUrl,detail:'low'});
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),55000);
 try {
 const response=await fetch('https://api.openai.com/v1/responses',{
  method:'POST',headers:{authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'content-type':'application/json'},
  signal:controller.signal,body:JSON.stringify({model,store:false,instructions:call.system,
   input:[{role:'user',content}],max_output_tokens:call.maxTokens??2800,
   text:{format:{type:'json_schema',name:call.schemaName,strict:true,schema:call.schema}}})
 });
 if(!response.ok)throw new PublicError(502,'AI_PROVIDER_FAILED','분석 제공자 연결에 실패했습니다. 크레딧은 복원됩니다.');
 const body=await response.json() as Record<string,unknown>;
 const usage=body.usage as {input_tokens?:number;output_tokens?:number}|undefined;
 if(usage && Number.isSafeInteger(usage.input_tokens) && Number.isSafeInteger(usage.output_tokens)) {
   const input=usage.input_tokens!;const output=usage.output_tokens!;
   await call.onUsage({micro:costMicroUSD(model,input,output),input,output,providerId:String(body.id??'').slice(0,200)});
 }
 if(body.status==='incomplete')throw new PublicError(502,'AI_INCOMPLETE','분석을 마치지 못했습니다. 크레딧은 복원됩니다.');
 return parseJson<T>(extractOpenAiText(body));
 } finally {clearTimeout(timeout);}
}

function normalizeProvider(value: string | undefined): AiProvider | null {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "openai" || normalized === "anthropic") return normalized;
  return null;
}

function extractOpenAiText(body: Record<string, unknown>) {
  if (typeof body.output_text === "string" && body.output_text.trim()) return body.output_text;
  const output = Array.isArray(body.output) ? body.output : [];
  const texts: string[] = [];
  for (const item of output) {
    if (!isRecord(item) || !Array.isArray(item.content)) continue;
    for (const content of item.content) {
      if (!isRecord(content)) continue;
      if ((content.type === "output_text" || content.type === "text") && typeof content.text === "string") {
        texts.push(content.text);
      }
    }
  }
  return texts.join("").trim();
}

function parseJson<T>(value: string): T {
  if (!value) throw new Error("AI 응답이 비어 있습니다.");
  try {
    return JSON.parse(value) as T;
  } catch {
    const match = value.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI 응답을 구조화하지 못했습니다.");
    return JSON.parse(match[0]) as T;
  }
}

function parseDataUrl(value: string) {
  const match = value.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);
  if (!match) return null;
  return { mediaType: match[1], base64: match[2] };
}

function readApiError(body: Record<string, unknown>, fallback: string) {
  if (isRecord(body.error)) {
    if (typeof body.error.message === "string") return body.error.message;
    if (typeof body.error.type === "string") return `${fallback} (${body.error.type})`;
  }
  return fallback;
}

function sanitizeUserState(value: StructuredUserState): StructuredUserState {
  return {
    currentProduct: nullableText(value.currentProduct),
    painPoint: nullableText(value.painPoint),
    comfortableBudget: nullableText(value.comfortableBudget),
    maximumBudget: nullableText(value.maximumBudget),
    usedAccepted: typeof value.usedAccepted === "boolean" ? value.usedAccepted : null,
    urgency: nullableText(value.urgency),
    expectedUsePeriod: nullableText(value.expectedUsePeriod),
    environment: nullableText(value.environment),
    futurePlan: nullableText(value.futurePlan),
    mustHaves: stringArray(value.mustHaves),
    avoid: stringArray(value.avoid),
    uncertainties: stringArray(value.uncertainties),
  };
}

function sanitizeDecision(value: DecisionResult): DecisionResult {
  if (!value || !["BUY", "WAIT", "SKIP"].includes(value.verdict)) {
    throw new Error("AI 판단 결과 형식이 올바르지 않습니다.");
  }
  return {
    ...value,
    headline: String(value.headline ?? "").trim(),
    summary: String(value.summary ?? "").trim(),
    confidence: clamp(Number(value.confidence ?? 0), 0, 100),
    reasons: stringArray(value.reasons),
    tradeoffs: stringArray(value.tradeoffs),
    alternatives: Array.isArray(value.alternatives) ? value.alternatives.slice(0, 5) : [],
    avoid: stringArray(value.avoid),
    missingInformation: stringArray(value.missingInformation),
    userModelUsed: stringArray(value.userModelUsed),
    waitFor: nullableText(value.waitFor),
    recheckAt: nullableText(value.recheckAt),
  };
}

function stringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, 12);
}

function nullableText(value: unknown) {
  if (typeof value !== "string") return null;
  const clean = value.trim();
  return clean || null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export class AiNotConfiguredError extends Error {
  constructor() {
    super("AI API가 아직 연결되지 않았습니다.");
    this.name = "AiNotConfiguredError";
  }
}

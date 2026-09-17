export class PublicError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) throw new PublicError(403, 'ORIGIN_REJECTED', '요청 출처를 확인할 수 없습니다.');
}
export async function boundedJson(request: Request, maxBytes = 32768): Promise<unknown> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new PublicError(415, 'JSON_REQUIRED', 'JSON 요청이 필요합니다.');
  const reader = request.body?.getReader();
  if (!reader) throw new PublicError(400, 'EMPTY_BODY', '입력이 없습니다.');
  const chunks: Uint8Array[] = []; let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      length += value.byteLength;
      if (length > maxBytes) { await reader.cancel(); throw new PublicError(413, 'BODY_TOO_LARGE', '입력이 너무 큽니다.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length); let offset=0;
  for (const chunk of chunks) { bytes.set(chunk,offset); offset+=chunk.byteLength; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new PublicError(400, 'INVALID_JSON', '입력 형식을 확인해 주세요.'); }
}
export function json(data: unknown, status=200) {
  return Response.json(data,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
}
export function errorResponse(error: unknown) {
  if (error instanceof PublicError) return json({code:error.code,error:error.message},error.status);
  console.error('BUYSOR operation failed', {type:error instanceof Error ? error.name : 'unknown'});
  return json({code:'SERVICE_UNAVAILABLE',error:'처리를 완료하지 못했습니다. 잠시 후 다시 확인해 주세요.'},503);
}
export async function digest(value: string) {
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
  return Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,'0')).join('');
}

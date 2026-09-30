import { boundedText, json, errorResponse, PublicError } from '@/lib/request-safety';
import { reconcileGlobalPayment, verifyPaddleSignature } from '@/lib/global-payments';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  try {
    const secret = process.env.PADDLE_WEBHOOK_SECRET || '';
    const raw = await boundedText(request, 65536);
    if (!await verifyPaddleSignature(raw, request.headers.get('paddle-signature') || '', secret)) return json({error:'Invalid signature'},403);
    let body: {event_type?:string;data?:{id?:string;transaction_id?:string;custom_data?:{order_id?:string}}};
    try { body = JSON.parse(raw); } catch { throw new PublicError(400,'INVALID_EVENT','Invalid event'); }
    if (body.event_type?.startsWith('transaction.')) await reconcileGlobalPayment(body.data?.id || '',body.data?.custom_data?.order_id);
    else if (body.event_type?.startsWith('adjustment.')) await reconcileGlobalPayment(body.data?.transaction_id || '');
    return json({received:true});
  } catch (error) { return errorResponse(error); }
}

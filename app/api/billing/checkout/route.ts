import { getChatGPTUser } from '@/app/chatgpt-auth';
import { commerceDb } from '@/lib/commerce-store';
import { checkoutReady } from '@/lib/commerce-runtime';
import { json, errorResponse, PublicError } from '@/lib/request-safety';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const user = await getChatGPTUser(); if (!user) throw new PublicError(401,'SIGN_IN_REQUIRED','Please sign in with Google.');
    const id = new URL(request.url).searchParams.get('transaction') || '';
    if (!/^txn_[a-z\d]{26}$/.test(id)) throw new PublicError(400,'INVALID_PAYMENT','Check the transaction.');
    const db = await commerceDb();
    const order = await db.prepare('SELECT b.id,b.status,b.amount,b.credits FROM billing_orders b JOIN billing_market m ON m.order_id=b.id WHERE m.transaction_id=? AND b.user_id=?').bind(id,user.id).first<{id:string;status:string;amount:number;credits:number}>();
    if (!order) throw new PublicError(404,'ORDER_NOT_FOUND','Order not found.');
    if (order.status !== 'pending' && order.status !== 'paid') throw new PublicError(409,'ORDER_NOT_PENDING','Check the order status.');
    if (order.status === 'pending' && !checkoutReady()) throw new PublicError(503,'CHECKOUT_NOT_READY','Checkout is not available yet.');
    return json({orderId:order.id,status:order.status,amount:order.amount,credits:order.credits,currency:'USD',clientToken:order.status==='pending'?process.env.PADDLE_CLIENT_TOKEN:null});
  } catch (error) { return errorResponse(error); }
}

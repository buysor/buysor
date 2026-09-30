import { commerceDb } from './commerce-store';
import { BILLING_POLICY_VERSION, usdProductById } from './commerce-policy';
import { requireCheckout } from './commerce-runtime';
import { PublicError } from './request-safety';

type Order = { id: string; user_id: string; amount: number; credits: number; status: string; payment_key: string | null; price_id: string; transaction_id: string | null; refund_requested: number; refund_adjustment_id: string | null; total_amount: number | null };
type Transaction = { id: string; status: string; currency_code: string; custom_data: { order_id?: string; user_id?: string; policy_version?: string } | null; items: Array<{ quantity: number; price: { id: string; billing_cycle: unknown; tax_mode: string; unit_price: { amount: string; currency_code: string } } }>; details: { totals: { subtotal: string; discount: string; tax: string; total: string; grand_total: string } }; checkout?: { url: string | null }; payments: Array<{ amount: string; status: string }>; adjustments?: Adjustment[] };
type Adjustment = { id: string; transaction_id: string; action: string; type: string; status: string; currency_code: string; totals: { total: string } };
const TXN = /^txn_[a-z\d]{26}$/;
const invalid = () => new PublicError(409, 'PAYMENT_MISMATCH', 'Payment details do not match this order. Contact support.');
function minor(value: string | undefined): number {
  if (!value || !/^\d{1,12}$/.test(value)) throw invalid();
  const n = Number(value); if (!Number.isSafeInteger(n)) throw invalid(); return n;
}
function apiOrigin() {
  const sandbox = process.env.PADDLE_ENV === 'sandbox';
  const key = process.env.PADDLE_API_KEY;
  if (!key?.startsWith(sandbox ? 'pdl_sdbx_apikey_' : 'pdl_live_apikey_')) throw new PublicError(503, 'PAYMENTS_OFFLINE', 'Payments are not connected yet.');
  return sandbox ? 'https://sandbox-api.paddle.com' : 'https://api.paddle.com';
}
async function paddle<T>(path: string, method: 'GET' | 'POST' = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(apiOrigin() + path, { method, signal: AbortSignal.timeout(18000), headers: { authorization: `Bearer ${process.env.PADDLE_API_KEY}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  if (!response.ok) throw new PublicError(502, 'PAYMENT_PROVIDER_ERROR', 'Could not verify payment with the provider. Keep your order number and retry.');
  return (await response.json() as { data: T }).data;
}
async function readOrder(id: string, userId?: string) {
  const db = await commerceDb();
  const row = await db.prepare(`SELECT b.*, m.price_id,m.transaction_id,m.refund_requested,m.refund_adjustment_id,m.total_amount FROM billing_orders b JOIN billing_market m ON m.order_id=b.id WHERE b.id=? ${userId ? 'AND b.user_id=?' : ''}`).bind(...(userId ? [id, userId] : [id])).first<Order>();
  if (!row) throw new PublicError(404, 'ORDER_NOT_FOUND', 'Order not found.'); return row;
}
/** Verify the server-created quote, owner, transaction, product and captured payment. */
export function verifyGlobalPayment(transaction: Transaction, order: Order, completed = false) {
  const item = transaction.items?.[0]; const totals = transaction.details?.totals;
  if (!TXN.test(transaction.id) || (order.transaction_id && order.transaction_id !== transaction.id) || transaction.currency_code !== 'USD'
    || transaction.custom_data?.order_id !== order.id || transaction.custom_data?.user_id !== order.user_id || transaction.custom_data?.policy_version !== BILLING_POLICY_VERSION
    || transaction.items?.length !== 1 || item.quantity !== 1 || item.price.id !== order.price_id || item.price.billing_cycle !== null
    || item.price.tax_mode !== 'external' || item.price.unit_price.currency_code !== 'USD' || minor(item.price.unit_price.amount) !== order.amount
    || minor(totals?.subtotal) !== order.amount || minor(totals?.discount) !== 0) throw invalid();
  const tax = minor(totals.tax), total = minor(totals.total);
  if (total !== order.amount + tax || minor(totals.grand_total) !== total) throw invalid();
  if (completed && (transaction.status !== 'completed' || !transaction.payments?.some(p => p.status === 'captured')
    || transaction.payments.filter(p => p.status === 'captured').reduce((n,p) => n + minor(p.amount),0) !== total)) throw new PublicError(409, 'PAYMENT_NOT_DONE', 'Credits are added after the payment is fully verified.');
  return { tax, total };
}
export async function createGlobalOrder(userId: string, productId: string, acceptedPrice: number) {
  requireCheckout(); const product = usdProductById(productId);
  if (!product || acceptedPrice !== product.price) throw new PublicError(409, 'PRICE_CHANGED', 'Review the current price before checking out.');
  const priceId = process.env[`PADDLE_PRICE_${product.id.toUpperCase()}`] || '';
  if (!/^pri_[a-z\d]{26}$/.test(priceId)) throw new PublicError(503, 'CHECKOUT_NOT_READY', 'Checkout is being prepared.');
  const db = await commerceDb();
  const count = await db.prepare('SELECT COUNT(*) n FROM billing_orders WHERE user_id=? AND created_at>?').bind(userId, Date.now()-3600000).first<{n:number}>();
  if ((count?.n || 0) >= 8) throw new PublicError(429, 'ORDER_LIMIT', 'Too many order attempts. Check your existing orders.');
  const id = crypto.randomUUID();
  await db.batch([
    db.prepare("INSERT INTO billing_orders(id,user_id,product_id,policy_version,amount,credits,status,created_at) VALUES(?,?,?,?,?,?,'pending',?)").bind(id,userId,product.id,BILLING_POLICY_VERSION,product.price,product.credits,Date.now()),
    db.prepare("INSERT INTO billing_market(order_id,provider,currency,price_id) VALUES(?,'paddle','USD',?)").bind(id,priceId),
  ]);
  const origin = new URL(process.env.PUBLIC_ORIGIN!).origin;
  // Never retry an uncertain provider create: a later webhook can recover the same local order.
  const transaction = await paddle<Transaction>('/transactions','POST',{ items:[{price_id:priceId,quantity:1}],currency_code:'USD',collection_mode:'automatic',custom_data:{order_id:id,user_id:userId,policy_version:BILLING_POLICY_VERSION},checkout:{url:`${origin}/billing/checkout`} });
  const order = await readOrder(id,userId); verifyGlobalPayment(transaction,order);
  const url = new URL(transaction.checkout?.url || '');
  if (url.origin !== origin || url.pathname !== '/billing/checkout' || url.searchParams.get('_ptxn') !== transaction.id) throw new PublicError(502,'INVALID_CHECKOUT','Could not open the verified checkout.');
  await db.prepare('UPDATE billing_market SET transaction_id=? WHERE order_id=? AND transaction_id IS NULL').bind(transaction.id,id).run();
  return { orderId:id,url:url.href,provider:'paddle',currency:'USD' };
}
export async function confirmGlobalOrder(userId: string, id: string, transactionId: string) {
  const order = await readOrder(id,userId);
  if (!TXN.test(transactionId) || (order.transaction_id && order.transaction_id !== transactionId)) throw invalid();
  if (order.status === 'paid') { if (order.payment_key !== transactionId) throw invalid(); return {orderId:id,credits:order.credits,amount:order.total_amount??order.amount,currency:'USD',status:'paid',replayed:true}; }
  if (order.status !== 'pending') throw new PublicError(409,'ORDER_NOT_PENDING','Check the status of this order.');
  const transaction = await paddle<Transaction>(`/transactions/${transactionId}?include=adjustments`);
  const verified = verifyGlobalPayment(transaction,order,true);
  if (transaction.adjustments?.some(a => ['approved','pending_approval'].includes(a.status) && ['refund','chargeback','chargeback_warning'].includes(a.action))) throw new PublicError(409,'PAYMENT_REVIEW','This payment needs review before credits can be issued.');
  const db = await commerceDb();
  await db.batch([
    db.prepare('UPDATE billing_market SET transaction_id=?,total_amount=?,tax_amount=? WHERE order_id=? AND (transaction_id IS NULL OR transaction_id=?)').bind(transactionId,verified.total,verified.tax,id,transactionId),
    db.prepare("UPDATE billing_orders SET status='paid',payment_key=?,paid_at=? WHERE id=? AND user_id=? AND status='pending'").bind(transactionId,Date.now(),id,userId),
  ]);
  const current = await readOrder(id,userId); if (current.status !== 'paid' || current.payment_key !== transactionId) throw invalid();
  return {orderId:id,credits:order.credits,amount:verified.total,currency:'USD',status:'paid'};
}
async function applyAdjustments(order: Order, transaction: Transaction) {
  const relevant = (transaction.adjustments || []).filter(a => ['refund','chargeback','chargeback_warning'].includes(a.action) && ['approved','pending_approval'].includes(a.status));
  if (!relevant.length) {
    const rejected = transaction.adjustments?.some(a=>a.id===order.refund_adjustment_id && a.action==='refund' && a.type==='full' && a.status==='rejected' && a.transaction_id===transaction.id);
    if (rejected && order.status==='refund_pending' && order.refund_adjustment_id) {
      const db=await commerceDb();
      await db.prepare("UPDATE billing_orders SET status='paid' WHERE id=? AND status='refund_pending'").bind(order.id).run();
      return true;
    }
    return false;
  }
  const db = await commerceDb();
  const full = relevant.some(a => a.action === 'refund' && a.type === 'full' && a.status === 'approved' && a.transaction_id === transaction.id && a.currency_code === 'USD' && minor(a.totals?.total) === minor(transaction.details.totals.grand_total));
  if (full && ['paid','refund_pending'].includes(order.status)) {
    try { await db.batch([db.prepare("UPDATE billing_orders SET status='refund_pending' WHERE id=? AND status='paid'").bind(order.id),db.prepare("UPDATE billing_orders SET status='refunded' WHERE id=? AND status='refund_pending'").bind(order.id)]); return true; } catch { /* A concurrent spend is reviewed and frozen below. */ }
  }
  if (order.status === 'refunded') return true;
  if (order.status==='paid' && relevant.every(a=>a.action==='refund' && a.type==='full' && a.status==='pending_approval')) {
    try { await db.batch([
      db.prepare('UPDATE billing_market SET refund_adjustment_id=? WHERE order_id=?').bind(relevant[0].id,order.id),
      db.prepare("UPDATE billing_orders SET status='refund_pending' WHERE id=? AND status='paid'").bind(order.id)]);return true; } catch { /* Used credits need support review. */ }
  }
  if (order.status === 'refund_pending' && relevant.every(a => a.action === 'refund' && a.type === 'full' && a.status === 'pending_approval')) return true;
  await db.batch([db.prepare('UPDATE credit_lots SET frozen=1 WHERE source_key=?').bind(`order:${order.id}`),db.prepare("UPDATE billing_orders SET status='review' WHERE id=? AND status!='refunded'").bind(order.id)]);
  return true;
}
export async function refundGlobalOrder(userId: string,id: string) {
  const order = await readOrder(id,userId); const db = await commerceDb();
  if (order.status === 'refunded') return {status:'refunded',replayed:true};
  if (!order.transaction_id || !['paid','refund_pending'].includes(order.status)) throw new PublicError(409,'REFUND_REVIEW','Support needs to review this order.');
  if (order.status === 'paid') { try { await db.prepare("UPDATE billing_orders SET status='refund_pending' WHERE id=? AND status='paid'").bind(id).run(); } catch { throw new PublicError(409,'REFUND_REVIEW','Used credits require support review.'); } }
  const transaction = await paddle<Transaction>(`/transactions/${order.transaction_id}?include=adjustments`); verifyGlobalPayment(transaction,order,true);
  if (await applyAdjustments({...order,status:'refund_pending'},transaction)) { const current = await readOrder(id,userId); if (current.status === 'refunded') return {status:'refunded'}; if(current.status==='paid')throw new PublicError(409,'REFUND_REJECTED','The refund request was declined. Credits are available again; contact support.'); throw new PublicError(409,'REFUND_PENDING','Refund verification is pending. Credits remain locked until confirmed.'); }
  const lock = await db.prepare('UPDATE billing_market SET refund_requested=1 WHERE order_id=? AND refund_requested=0').bind(id).run();
  if (Number(lock.meta.changes) === 1) {
    const adjustment=await paddle<Adjustment>('/adjustments','POST',{action:'refund',type:'full',transaction_id:order.transaction_id,reason:'Customer requested a full refund of unused BUYSOR credits'});
    if(adjustment.transaction_id!==order.transaction_id || adjustment.action!=='refund' || adjustment.type!=='full' || !/^adj_[a-z\d]{26}$/.test(adjustment.id))throw invalid();
    await db.prepare('UPDATE billing_market SET refund_adjustment_id=? WHERE order_id=?').bind(adjustment.id,id).run();
  }
  // Approval is asynchronous. Never unfreeze on a timeout or resend an uncertain refund.
  throw new PublicError(409,'REFUND_PENDING','Refund requested. Check the same order later; credits remain locked.');
}
export async function reconcileGlobalPayment(transactionId: string, claimedOrderId?: string) {
  if (!TXN.test(transactionId)) return {ignored:true};
  const db = await commerceDb();
  const reference = await db.prepare('SELECT order_id FROM billing_market WHERE transaction_id=?').bind(transactionId).first<{order_id:string}>();
  const id = reference?.order_id || claimedOrderId;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return {ignored:true};
  const order = await readOrder(id); const transaction = await paddle<Transaction>(`/transactions/${transactionId}?include=adjustments`); verifyGlobalPayment(transaction,order);
  await db.prepare('UPDATE billing_market SET transaction_id=? WHERE order_id=? AND transaction_id IS NULL').bind(transactionId,id).run();
  if (await applyAdjustments(order,transaction)) return {status:(await readOrder(id)).status};
  if (transaction.status === 'completed' && order.status === 'pending') return confirmGlobalOrder(order.user_id,id,transactionId);
  return {status:order.status};
}
export async function verifyPaddleSignature(raw: string, header: string, secret: string, now = Date.now()) {
  if (header.length > 500 || secret.length < 32) return false;
  const parts = header.split(';').map(part => part.trim().split('='));
  const times = parts.filter(([key]) => key === 'ts'); const signatures = parts.filter(([key]) => key === 'h1').map(([,value]) => value);
  if (times.length !== 1 || !/^\d{10}$/.test(times[0][1]) || Math.abs(now/1000 - Number(times[0][1])) > 300 || !signatures.length) return false;
  const key = await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
  const payload = new TextEncoder().encode(`${times[0][1]}:${raw}`);
  for (const signature of signatures) { if (/^[a-f\d]{64}$/.test(signature)) { const bytes = Uint8Array.from(signature.match(/../g)!,hex => parseInt(hex,16)); if (await crypto.subtle.verify('HMAC',key,bytes,payload)) return true; } }
  return false;
}

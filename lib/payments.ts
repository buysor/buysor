import { commerceDb } from './commerce-store';
import { POLICY_VERSION, productById } from './commerce-policy';
import { requireCheckout } from './commerce-runtime';
import { PublicError } from './request-safety';
type Order={id:string;user_id:string;product_id:string;amount:number;credits:number;status:string;payment_key:string|null;created_at:number};
type Payment={orderId:string;paymentKey:string;mId:string;currency:string;totalAmount:number;balanceAmount:number;status:string;approvedAt:string|null;checkout?:{url:string}};
async function toss(path:string, method:'GET'|'POST', body?:unknown, idempotency?:string):Promise<Payment> {
 const key=process.env.TOSS_SECRET_KEY;if(!key)throw new PublicError(503,'PAYMENTS_OFFLINE','결제 연결을 확인해 주세요.');
 const timeout=AbortSignal.timeout(18000);
 const response=await fetch(`https://api.tosspayments.com${path}`,{method,signal:timeout,
  headers:{authorization:`Basic ${btoa(key+':')}`,'content-type':'application/json',...(idempotency?{'Idempotency-Key':idempotency}:{})},body:body?JSON.stringify(body):undefined});
 if(!response.ok)throw new PublicError(502,'PAYMENT_PROVIDER_ERROR','결제 제공자의 상태를 확인하지 못했습니다. 주문번호로 재확인해 주세요.');
 return await response.json() as Payment;
}
function verify(payment:Payment,order:Order) {
 if(payment.orderId!==order.id || payment.mId!==process.env.TOSS_MERCHANT_ID || payment.currency!=='KRW'
  ||payment.totalAmount!==order.amount || (order.payment_key&&payment.paymentKey!==order.payment_key)
  ||typeof payment.paymentKey!=='string'||payment.paymentKey.length>200)
 throw new PublicError(409,'PAYMENT_MISMATCH','주문과 결제 정보가 다릅니다. 고객지원에 문의해 주세요.');
}
async function orderFor(id:string,userId:string) {
 const db=await commerceDb();const order=await db.prepare('SELECT * FROM billing_orders WHERE id=? AND user_id=?').bind(id,userId).first<Order>();
 if(!order)throw new PublicError(404,'ORDER_NOT_FOUND','주문을 찾을 수 없습니다.');return order;
}
export async function createOrder(userId:string,productId:string,acceptedPrice:number) {
 requireCheckout();const product=productById(productId);
 if(!product||acceptedPrice!==product.price)throw new PublicError(409,'PRICE_CHANGED','결제 금액을 다시 확인해 주세요.');
 const db=await commerceDb();
 const count=await db.prepare('SELECT COUNT(*) AS n FROM billing_orders WHERE user_id=? AND created_at>?').bind(userId,Date.now()-3600000).first<{n:number}>();
 if((count?.n??0)>=8)throw new PublicError(429,'ORDER_LIMIT','주문 요청이 많습니다. 기존 주문을 확인해 주세요.');
 const id=crypto.randomUUID();
 await db.prepare("INSERT INTO billing_orders(id,user_id,product_id,policy_version,amount,credits,status,created_at) VALUES(?,?,?,?,?,?,'pending',?)")
  .bind(id,userId,product.id,POLICY_VERSION,product.price,product.credits,Date.now()).run();
 const origin=new URL(process.env.PUBLIC_ORIGIN!).origin;
 const payment=await toss('/v1/payments','POST',{method:'CARD',currency:'KRW',amount:product.price,orderId:id,
  orderName:`BUYSOR ${product.credits}C`,successUrl:`${origin}/billing/success`,failUrl:`${origin}/billing/fail`},`create:${id}`);
 const url=new URL(payment.checkout?.url??'');
 if(url.protocol!=='https:'||!(url.hostname==='tosspayments.com'||url.hostname.endsWith('.tosspayments.com')))
 throw new PublicError(502,'INVALID_CHECKOUT','결제창 주소를 확인하지 못했습니다.');
 if(payment.paymentKey)await db.prepare('UPDATE billing_orders SET payment_key=? WHERE id=? AND payment_key IS NULL').bind(payment.paymentKey,id).run();
 return {orderId:id,url:url.href};
}
export async function confirmOrder(userId:string,id:string,paymentKey:string,acceptedAmount:number){
 const order=await orderFor(id,userId);
 if(order.amount!==acceptedAmount || (order.payment_key&&order.payment_key!==paymentKey))throw new PublicError(409,'PAYMENT_MISMATCH','결제 정보가 일치하지 않습니다.');
 if(order.status==='paid')return {orderId:id,credits:order.credits,status:'paid',replayed:true};
 if(order.status!=='pending')throw new PublicError(409,'ORDER_NOT_PENDING','주문 상태를 확인해 주세요.');
 // Reconcile before retrying an uncertain confirmation; never mint from callback fields.
 let payment=await toss(`/v1/payments/orders/${encodeURIComponent(id)}`,'GET');verify(payment,order);
 if(payment.paymentKey!==paymentKey)throw new PublicError(409,'PAYMENT_MISMATCH','결제 정보를 다시 확인해 주세요.');
 if(payment.status==='IN_PROGRESS') {
   requireCheckout();payment=await toss('/v1/payments/confirm','POST',{orderId:id,paymentKey,amount:order.amount},`confirm:${id}`);verify(payment,order);
 }
 if(payment.status!=='DONE'||payment.balanceAmount!==order.amount||!payment.approvedAt||!Number.isFinite(Date.parse(payment.approvedAt)))
  throw new PublicError(409,'PAYMENT_NOT_DONE','결제 완료가 확인된 후 크레딧이 지급됩니다.');
 const db=await commerceDb();
 await db.prepare("UPDATE billing_orders SET status='paid',payment_key=?,paid_at=? WHERE id=? AND user_id=? AND status='pending'")
  .bind(payment.paymentKey,Date.now(),id,userId).run();
 const checked=await orderFor(id,userId);if(checked.status!=='paid')throw new PublicError(409,'PAYMENT_REVIEW','주문 상태 재확인이 필요합니다.');
 return {orderId:id,credits:order.credits,status:'paid'};
}
export async function refundUnusedOrder(userId:string,id:string){
 let order=await orderFor(id,userId);const db=await commerceDb();
 if(order.status==='refunded')return {status:'refunded',replayed:true};
 if(!order.payment_key||!['paid','refund_pending'].includes(order.status))throw new PublicError(409,'REFUND_REVIEW','사용 이력이나 주문 상태를 고객지원에서 확인해야 합니다.');
 if(order.status==='paid'){
  try{await db.prepare("UPDATE billing_orders SET status='refund_pending' WHERE id=? AND user_id=? AND status='paid'").bind(id,userId).run();}
  catch{throw new PublicError(409,'REFUND_REVIEW','사용 이력이 있는 주문은 고객지원에서 환불 범위를 확인합니다.');}
 }
 // On timeout keep credits frozen and the order pending; retry reconciles remote state.
 let payment=await toss(`/v1/payments/${encodeURIComponent(order.payment_key)}`,'GET');verify(payment,order);
 if(payment.status==='DONE') {payment=await toss(`/v1/payments/${encodeURIComponent(order.payment_key)}/cancel`,'POST',
  {cancelReason:'Customer requested refund of unused credit pack'},`refund:${id}`);verify(payment,order);}
 if(payment.status==='CANCELED'&&payment.balanceAmount===0){
  await db.prepare("UPDATE billing_orders SET status='refunded' WHERE id=? AND user_id=? AND status='refund_pending'").bind(id,userId).run();return {status:'refunded'};
 }
 throw new PublicError(409,'REFUND_PENDING','환불 확인 중입니다. 사용권은 확인 전까지 잠금 처리됩니다.');
}

/** Authenticate webhook transport in the route, then verify provider state, not its body. */
export async function reconcilePayment(id:string) {
 const db=await commerceDb();const order=await db.prepare('SELECT * FROM billing_orders WHERE id=?').bind(id).first<Order>();
 if(!order)return {ignored:true};
 const payment=await toss(`/v1/payments/orders/${encodeURIComponent(id)}`,'GET');verify(payment,order);
 if(payment.status==='DONE'&&payment.balanceAmount===order.amount&&order.status==='pending')return confirmOrder(order.user_id,id,payment.paymentKey,order.amount);
 if(['CANCELED','PARTIAL_CANCELED'].includes(payment.status)) {
  if(order.status==='refunded')return {status:'refunded'};
  const lot=await db.prepare('SELECT granted,available,frozen FROM credit_lots WHERE source_key=?').bind(`order:${id}`).first<{granted:number;available:number;frozen:number}>();
  if(payment.status==='CANCELED'&&payment.balanceAmount===0&&lot&&lot.available===lot.granted&&['paid','refund_pending'].includes(order.status)) {
    try{await db.batch([
      db.prepare("UPDATE billing_orders SET status='refund_pending' WHERE id=? AND status='paid'").bind(id),
      db.prepare("UPDATE billing_orders SET status='refunded' WHERE id=? AND status='refund_pending'").bind(id)
    ]);return {status:'refunded'};}catch{/* Concurrent consumption needs manual review below. */}
  }
  await db.batch([
   db.prepare('UPDATE credit_lots SET frozen=1 WHERE source_key=?').bind(`order:${id}`),
   db.prepare("UPDATE billing_orders SET status='review' WHERE id=? AND status!='refunded'").bind(id)
  ]);return {status:'review'};
 }
 return {status:order.status};
}

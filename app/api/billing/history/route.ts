import {getChatGPTUser} from '@/app/chatgpt-auth';import {commerceDb} from '@/lib/commerce-store';import {json,errorResponse} from '@/lib/request-safety';
export const dynamic='force-dynamic';
export async function GET(){try{const user=await getChatGPTUser();if(!user)return json({error:'Sign in required'},401);
 const db=await commerceDb();const orders=await db.prepare("SELECT b.id,b.product_id,COALESCE(m.total_amount,b.amount) amount,b.credits,b.status,b.created_at,COALESCE(m.currency,'KRW') currency,COALESCE(m.provider,'toss') provider FROM billing_orders b LEFT JOIN billing_market m ON m.order_id=b.id WHERE b.user_id=? ORDER BY b.created_at DESC LIMIT 50").bind(user.id).all();
 return json({items:orders.results,orders:orders.results});}catch(e){return errorResponse(e);}}

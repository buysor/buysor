import {getChatGPTUser} from '@/app/chatgpt-auth';import {commerceDb} from '@/lib/commerce-store';import {json,errorResponse} from '@/lib/request-safety';
export const dynamic='force-dynamic';
export async function GET(){try{const user=await getChatGPTUser();if(!user)return json({error:'Sign in required'},401);
 const db=await commerceDb();const orders=await db.prepare('SELECT id,product_id,amount,credits,status,created_at FROM billing_orders WHERE user_id=? ORDER BY created_at DESC LIMIT 50').bind(user.id).all();
 return json({orders:orders.results});}catch(e){return errorResponse(e);}}

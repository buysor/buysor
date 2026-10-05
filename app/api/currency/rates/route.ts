import { getReferenceRates } from '@/lib/exchange-rate-service';
export const dynamic = 'force-dynamic';
export async function GET() {
  const result = await getReferenceRates();
  return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
}

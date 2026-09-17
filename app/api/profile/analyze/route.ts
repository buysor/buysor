import {json} from '@/lib/request-safety';
export async function POST(){return json({code:'INCLUDED_IN_DECISION',error:'프로필 입력과 저장은 무료입니다. AI 해석은 구매판단에 포함됩니다.'},409);}

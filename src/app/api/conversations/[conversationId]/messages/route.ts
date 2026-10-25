import { NextResponse } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { cleanText, getApiUser, jsonError, sameOrigin } from "@/lib/http";
import { consumeRateLimit, requestIpKey } from "@/lib/rate-limit";
export const runtime = "nodejs";
type Ctx = { params: Promise<{ conversationId: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function canAccess(conversationId: string, userId: string) {
  const result = await query(`SELECT c.id,other.id AS other_user_id,other.display_name AS other_display_name,other.username AS other_username,
    other.avatar_color AS other_avatar_color,(other.avatar_image_mime IS NOT NULL) AS other_has_avatar FROM conversations c JOIN conversation_members mine ON mine.conversation_id=c.id AND mine.user_id=$2
    JOIN conversation_members peer ON peer.conversation_id=c.id AND peer.user_id<>$2 JOIN users other ON other.id=peer.user_id WHERE c.id=$1 AND other.account_status='active'`, [conversationId,userId]);
  return result.rows[0] || null;
}
export async function GET(_request: Request, context: Ctx) {
  const { user,response } = await getApiUser({ verified:true }); if(response)return response;
  const {conversationId}=await context.params;if(!UUID.test(conversationId))return jsonError("المحادثة غير صالحة.",400);
  const peer=await canAccess(conversationId,user!.id);if(!peer)return jsonError("المحادثة غير موجودة أو لا تملك صلاحية الوصول إليها.",404);
  try { const result=await query(`SELECT m.id,m.conversation_id,m.sender_id,m.body,m.created_at,m.edited_at,u.display_name,u.username,u.avatar_color,(u.avatar_image_mime IS NOT NULL) AS has_avatar
    FROM messages m JOIN users u ON u.id=m.sender_id WHERE m.conversation_id=$1 AND m.deleted_at IS NULL ORDER BY m.created_at DESC LIMIT 80`,[conversationId]);
    await query("UPDATE conversation_members SET last_read_at=now() WHERE conversation_id=$1 AND user_id=$2",[conversationId,user!.id]);
    return NextResponse.json({conversation:peer,messages:result.rows.reverse()});
  } catch(error){console.error("AXIS messages load error",(error as {code?:string})?.code||"database_error");return jsonError("مش قادرين نحمّل الرسائل دلوقتي.",500);}
}
export async function POST(request: Request, context: Ctx) {
  if(!sameOrigin(request))return jsonError("طلب غير صالح.",403);
  const{user,response}=await getApiUser({verified:true});if(response)return response;
  const{conversationId}=await context.params;if(!UUID.test(conversationId))return jsonError("المحادثة غير صالحة.",400);
  let input:Record<string,unknown>;try{input=await request.json();}catch{return jsonError("الرسالة غير صالحة.");}
  const body=cleanText(input.body,5000);if(!body)return jsonError("اكتب رسالتك الأول.");
  if(await consumeRateLimit("send-message",`${requestIpKey(request)}:${user!.id}`,{limit:45,windowMinutes:1,blockMinutes:2}))return jsonError("الرسائل بتتبعت بسرعة كبيرة. استنى دقيقة وحاول تاني.",429);
  try { const created=await withTransaction(async client=>{
    const peer=await client.query<{user_id:string}>(`SELECT user_id FROM conversation_members WHERE conversation_id=$1 AND user_id<>$2 LIMIT 1`,[conversationId,user!.id]);
    const own=await client.query("SELECT 1 FROM conversation_members WHERE conversation_id=$1 AND user_id=$2",[conversationId,user!.id]);
    if(!peer.rows[0]||!own.rows.length)throw Object.assign(new Error("المحادثة غير موجودة أو لا تملك صلاحية الوصول إليها."),{statusCode:404});
    const target=await client.query("SELECT id FROM users WHERE id=$1 AND account_status='active'",[peer.rows[0].user_id]);
    if(!target.rows[0])throw Object.assign(new Error("الحساب الآخر غير متاح حاليًا."),{statusCode:409});
    const result=await client.query(`INSERT INTO messages(conversation_id,sender_id,body) VALUES($1,$2,$3) RETURNING id,conversation_id,sender_id,body,created_at`,[conversationId,user!.id,body]);
    await client.query("UPDATE conversations SET updated_at=now() WHERE id=$1",[conversationId]);
    await client.query("INSERT INTO notifications(user_id,actor_id,kind,message,target_conversation_id) VALUES($1,$2,'message',$3,$4)",[peer.rows[0].user_id,user!.id,`${user!.display_name} بعتلك رسالة.`,conversationId]);
    return result.rows[0];
  });
  return NextResponse.json({message:{...created,display_name:user!.display_name,username:user!.username,avatar_color:user!.avatar_color,has_avatar:Boolean(user!.has_avatar)}},{status:201});
  }catch(error){return jsonError(error instanceof Error?error.message:"ما قدرناش نبعت الرسالة دلوقتي.",(error as {statusCode?:number}).statusCode||500);}
}

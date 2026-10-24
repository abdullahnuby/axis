import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getApiUser,jsonError,sameOrigin } from "@/lib/http";
import { consumeRateLimit, requestIpKey } from "@/lib/rate-limit";
export const runtime="nodejs"; type Ctx={params:Promise<{groupId:string}>};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function POST(request:Request,context:Ctx){
 if(!sameOrigin(request))return jsonError("طلب غير صالح.",403);
 const{user,response}=await getApiUser({verified:true});if(response)return response;
 const{groupId}=await context.params;if(!UUID.test(groupId))return jsonError("المجموعة غير صالحة.",400);
 if(await consumeRateLimit("join-group",`${requestIpKey(request)}:${user!.id}`,{limit:30,windowMinutes:60,blockMinutes:30}))return jsonError("طلبات انضمام كتير في وقت قصير. جرّب بعد شوية.",429);
 const g=await query<{visibility:string}>("SELECT visibility FROM engineering_groups WHERE id=$1",[groupId]);
 if(!g.rows[0])return jsonError("المجموعة غير موجودة.",404);
 const existing=await query<{status:string}>("SELECT status FROM group_members WHERE group_id=$1 AND user_id=$2",[groupId,user!.id]);
 if(existing.rows[0]?.status==='active')return NextResponse.json({joined:true,pending:false,status:'active'});
 if(existing.rows[0]?.status==='pending')return NextResponse.json({joined:false,pending:true,status:'pending'});
 if(existing.rows[0]?.status==='suspended')return jsonError("تعذّر الانضمام للمجموعة بهذا الحساب.",403);
 const status=g.rows[0].visibility==="closed"?"pending":"active";
 await query("INSERT INTO group_members(group_id,user_id,role,status) VALUES($1,$2,'member',$3) ON CONFLICT(group_id,user_id) DO NOTHING",[groupId,user!.id,status]);
 const final=await query<{status:string}>("SELECT status FROM group_members WHERE group_id=$1 AND user_id=$2",[groupId,user!.id]);
 return NextResponse.json({joined:final.rows[0]?.status==='active',pending:final.rows[0]?.status==='pending',status:final.rows[0]?.status||status});
}
export async function DELETE(request:Request,context:Ctx){if(!sameOrigin(request))return jsonError("طلب غير صالح.",403);const{user,response}=await getApiUser({verified:true});if(response)return response;const{groupId}=await context.params;if(!UUID.test(groupId))return jsonError("المجموعة غير صالحة.",400);const result=await query("DELETE FROM group_members WHERE group_id=$1 AND user_id=$2 AND role<>'owner' RETURNING group_id",[groupId,user!.id]);if(!result.rows.length){const owner=await query("SELECT 1 FROM group_members WHERE group_id=$1 AND user_id=$2 AND role='owner'",[groupId,user!.id]);if(owner.rows.length)return jsonError("أنت صاحب المجموعة؛ انقل الملكية قبل مغادرتها.",409);}return NextResponse.json({joined:false});}

export async function PATCH(request:Request,context:Ctx){
 if(!sameOrigin(request))return jsonError("طلب غير صالح.",403);const{user,response}=await getApiUser({verified:true});if(response)return response;const{groupId}=await context.params;if(!UUID.test(groupId))return jsonError("المجموعة غير صالحة.",400);let input:Record<string,unknown>;try{input=await request.json();}catch{return jsonError("بيانات الطلب غير صالحة.");}const userId=typeof input.userId==="string"?input.userId:"";const action=input.action==="approve"?"approve":"reject";if(!UUID.test(userId))return jsonError("الحساب غير صالح.",400);const owner=await query("SELECT 1 FROM engineering_groups WHERE id=$1 AND created_by=$2",[groupId,user!.id]);if(!owner.rows.length&&user!.role!=="admin")return jsonError("صاحب المجموعة فقط يقدر يراجع طلبات الانضمام.",403);if(action==="approve"){const result=await query("UPDATE group_members SET status='active' WHERE group_id=$1 AND user_id=$2 AND status='pending' RETURNING user_id",[groupId,userId]);if(!result.rows.length)return jsonError("طلب الانضمام غير موجود.",404);await query("INSERT INTO notifications(user_id,actor_id,kind,message,target_group_id) VALUES($1,$2,'group',$3,$4)",[userId,user!.id,`تم قبول انضمامك إلى المجموعة.`,groupId]);return NextResponse.json({ok:true,status:"active"});}await query("DELETE FROM group_members WHERE group_id=$1 AND user_id=$2 AND status='pending'",[groupId,userId]);return NextResponse.json({ok:true,status:"rejected"});
}

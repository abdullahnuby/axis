import { NextResponse } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { cleanText, getApiUser, jsonError, sameOrigin } from "@/lib/http";
import { SPECIALTIES } from "@/lib/constants";
import { consumeRateLimit, requestIpKey } from "@/lib/rate-limit";
export const runtime = "nodejs";
function slugify(value: string) { return value.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu,"-").replace(/^-|-$/g,"").slice(0,70) || "engineering"; }
export async function GET(request: Request) {
 const {user,response}=await getApiUser({verified:true}); if(response)return response;
 const q=cleanText(new URL(request.url).searchParams.get("q"),100);
 try { const result=await query(`SELECT g.id,g.name,g.slug,g.description,g.specialty,g.visibility,g.created_at,u.display_name AS creator_name,
    (SELECT count(*)::int FROM group_members gm WHERE gm.group_id=g.id AND gm.status='active') AS member_count,
    EXISTS(SELECT 1 FROM group_members mine WHERE mine.group_id=g.id AND mine.user_id=$1 AND mine.status='active') AS is_member,
    EXISTS(SELECT 1 FROM group_members pending WHERE pending.group_id=g.id AND pending.user_id=$1 AND pending.status='pending') AS is_pending
    FROM engineering_groups g JOIN users u ON u.id=g.created_by
    WHERE true
      AND ($2='' OR g.name ILIKE '%'||$2||'%' OR g.description ILIKE '%'||$2||'%' OR COALESCE(g.specialty,'') ILIKE '%'||$2||'%')
    ORDER BY is_member DESC,member_count DESC,g.created_at DESC LIMIT 60`,[user!.id,q]); return NextResponse.json({groups:result.rows}); }
 catch(error){console.error("AXIS groups list error",(error as {code?:string})?.code||"database_error");return jsonError("مش قادرين نحمّل المجموعات دلوقتي.",500);}
}
export async function POST(request:Request){
 if(!sameOrigin(request))return jsonError("طلب غير صالح.",403);
 const {user,response}=await getApiUser({verified:true});if(response)return response;
 let input:Record<string,unknown>;try{input=await request.json();}catch{return jsonError("بيانات المجموعة غير صالحة.");}
 const name=cleanText(input.name,100),description=cleanText(input.description,1200),specialty=cleanText(input.specialty,80),visibility=input.visibility==="closed"?"closed":"public";
 if(name.length<3)return jsonError("اسم المجموعة لازم يكون 3 أحرف على الأقل.");
 if(specialty&&!(SPECIALTIES as readonly string[]).includes(specialty))return jsonError("التخصص المحدد غير صالح.");
 if (await consumeRateLimit("create-group", `${requestIpKey(request)}:${user!.id}`, { limit: 5, windowMinutes: 1440, blockMinutes: 1440 })) return jsonError("وصلت لحد إنشاء المجموعات لليوم. جرّب بكرة.", 429);
 const base=slugify(name);
 try { const group=await withTransaction(async client=>{const slug=`${base}-${Math.random().toString(36).slice(2,7)}`;const created=await client.query(`INSERT INTO engineering_groups(name,slug,description,specialty,visibility,created_by) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,name,slug,description,specialty,visibility,created_at`,[name,slug,description,specialty||null,visibility,user!.id]);await client.query("INSERT INTO group_members(group_id,user_id,role,status) VALUES($1,$2,'owner','active')",[created.rows[0].id,user!.id]);return created.rows[0];});return NextResponse.json({group},{status:201});}
 catch(error){console.error("AXIS create group error",(error as {code?:string})?.code||"database_error");return jsonError("ما قدرناش ننشئ المجموعة دلوقتي.",500);}
}

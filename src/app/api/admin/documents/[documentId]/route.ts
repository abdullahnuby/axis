import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getApiUser, jsonError } from "@/lib/http";
export const runtime = "nodejs";
type Ctx = { params: Promise<{ documentId: string }> };
export async function GET(_request: Request, context: Ctx) {
  const { user, response } = await getApiUser({ admin: true }); if (response) return response;
  if (!["admin", "reviewer"].includes(user!.role)) return jsonError("لا تملك صلاحية الوصول إلى مستندات التوثيق.", 403);
  const { documentId } = await context.params;
  const result = await query<{ content: Buffer; content_type: string; original_name: string }>("SELECT content,content_type,original_name FROM verification_documents WHERE id=$1", [documentId]);
  const document = result.rows[0]; if (!document) return jsonError("المستند غير موجود.", 404);
  const filename = document.original_name.replace(/[\r\n"\\]/g, "_");
  return new NextResponse(document.content, { headers: { "Content-Type": document.content_type, "Content-Disposition": `inline; filename="${filename}"`, "Cache-Control": "no-store, private", "X-Content-Type-Options": "nosniff" } });
}

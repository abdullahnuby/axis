import "server-only";
export type SafeUpload = { buffer: Buffer; mime: "application/pdf" | "image/jpeg" | "image/png" | "image/webp"; name: string; size: number };
const allowed = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

function detectMime(buffer: Buffer): SafeUpload["mime"] | null {
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-") return "application/pdf";
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))) return "image/png";
  if (buffer.length >= 12 && buffer.subarray(0,4).toString("ascii") === "RIFF" && buffer.subarray(8,12).toString("ascii") === "WEBP") return "image/webp";
  return null;
}

export async function parseSafeUpload(file: FormDataEntryValue | null, options: { allowPdf: boolean; maxBytes: number }): Promise<SafeUpload | null> {
  if (!file || typeof file === "string") return null;
  if (file.size <= 0 || file.size > options.maxBytes || !allowed.has(file.type)) throw new Error(`حجم أو نوع الملف غير مسموح. الحد ${Math.round(options.maxBytes / 1_000_000 * 10) / 10} ميجابايت.`);
  if (!options.allowPdf && file.type === "application/pdf") throw new Error("هذا الحقل يقبل الصور فقط.");
  const buffer = Buffer.from(await file.arrayBuffer());
  const detected = detectMime(buffer);
  if (!detected || detected !== file.type || (!options.allowPdf && detected === "application/pdf")) throw new Error("تعذر التحقق من نوع الملف. ارفع PDF أو صورة أصلية مدعومة فقط.");
  const safeName = file.name.replace(/[\\/\r\n\0]/g, "_").slice(0, 180) || "document";
  return { buffer, mime: detected, name: safeName, size: buffer.length };
}

import "server-only";

export function mailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM && process.env.APP_URL);
}

export async function sendTransactionalEmail(input: { to: string; subject: string; html: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) throw new Error("إرسال البريد غير مفعّل. اضبط RESEND_API_KEY وEMAIL_FROM في بيئة النشر.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [input.to], subject: input.subject, html: input.html }),
    cache: "no-store",
  });
  if (!response.ok) {
    // Keep recipient/provider response details out of application logs.
    console.error("AXIS email delivery failed", response.status);
    throw new Error("تعذر إرسال البريد الآن. جرّب تاني بعد شوية.");
  }
}

export function htmlEmail(title: string, message: string, link: string, action: string) {
  const safeTitle = title.replace(/[<>]/g, "");
  const safeMessage = message.replace(/[<>]/g, "");
  return `<!doctype html><html lang="ar" dir="rtl"><body style="margin:0;background:#f3f7fb;font-family:Arial,sans-serif;color:#102a43;padding:32px 12px"><main style="max-width:560px;margin:auto;background:#fff;border:1px solid #dce7f2;border-radius:18px;overflow:hidden"><header style="background:#09283a;padding:24px;color:#fff"><div style="font-size:22px;font-weight:700;letter-spacing:3px">AXIS <span style="color:#00c4cc">✳</span></div><p style="margin:8px 0 0;color:#a9e9ee">مجتمع المهندسين</p></header><section style="padding:28px"><h1 style="font-size:22px;margin:0 0 12px">${safeTitle}</h1><p style="font-size:16px;line-height:1.9">${safeMessage}</p><p style="margin:26px 0"><a href="${link}" style="display:inline-block;background:#007bff;color:#fff;text-decoration:none;padding:13px 20px;border-radius:10px;font-weight:700">${action}</a></p><p style="font-size:12px;line-height:1.8;color:#60768b">لو ما طلبتش الرسالة دي، تجاهلها. الرابط صالح لفترة محدودة.</p></section></main></body></html>`;
}

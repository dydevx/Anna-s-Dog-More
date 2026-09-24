import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, requestIp } from "@/lib/rate-limit";

const contactSchema = z.object({
  locale: z.enum(["de", "en"]),
  name: z.string().trim().min(2).max(100),
  email: z.email().max(254),
  subject: z.string().trim().min(3).max(160),
  message: z.string().trim().min(10).max(5000),
  website: z.string().max(0).optional().default(""),
});

export async function POST(request: Request) {
  if (!await rateLimit(`contact:${requestIp(request)}`, 4, 60)) return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  const parsed = contactSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_MESSAGE" }, { status: 400 });
  const message = {
    locale: parsed.data.locale,
    name: parsed.data.name,
    email: parsed.data.email,
    subject: parsed.data.subject,
    message: parsed.data.message,
  };
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("contact_inquiries").insert(message);
    if (error) {
      const { error: fallbackError } = await admin.from("store_settings").insert({
        key: `contact_inquiry:${crypto.randomUUID()}`,
        value: message,
        is_public: false,
      });
      if (fallbackError) throw fallbackError;
    }
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "CONTACT_UNAVAILABLE" }, { status: 503 });
  }
}

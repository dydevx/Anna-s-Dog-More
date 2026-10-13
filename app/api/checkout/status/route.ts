import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, requestIp } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };
  const token = z.uuid().safeParse(new URL(request.url).searchParams.get("token"));
  if (!token.success) return NextResponse.json({ error: "INVALID_TOKEN" }, { status: 400, headers });
  try {
    if (!await rateLimit(`payment-status:${requestIp(request)}`, 60, 60)) return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429, headers });
    const { data, error } = await createAdminClient().from("orders")
      .select("order_number,payment_status,grand_total,currency").eq("public_token", token.data).maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "ORDER_NOT_FOUND" }, { status: 404, headers });
    return NextResponse.json(data, { headers });
  } catch {
    return NextResponse.json({ error: "STATUS_UNAVAILABLE" }, { status: 503, headers });
  }
}

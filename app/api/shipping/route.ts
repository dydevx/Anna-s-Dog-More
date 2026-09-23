import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const querySchema = z.object({
  country: z.string().length(2).transform((value) => value.toUpperCase()),
  currency: z.string().length(3).transform((value) => value.toUpperCase()),
  subtotal: z.coerce.number().nonnegative(),
  locale: z.enum(["de", "en"]).default("de"),
});

export async function GET(request: Request) {
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_QUERY" }, { status: 400 });
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("shipping_methods")
      .select("id,name_de,name_en,estimated_delivery_de,estimated_delivery_en,shipping_zones!inner(country_codes,active),shipping_rates!inner(currency,fee,free_shipping_threshold,active)")
      .eq("active", true)
      .eq("shipping_zones.active", true)
      .contains("shipping_zones.country_codes", [parsed.data.country])
      .eq("shipping_rates.currency", parsed.data.currency)
      .eq("shipping_rates.active", true);
    if (error) throw error;
    const methods = (data ?? []).flatMap((method) => {
      const rate = Array.isArray(method.shipping_rates) ? method.shipping_rates[0] : method.shipping_rates;
      if (!rate) return [];
      const fee = rate.free_shipping_threshold !== null && parsed.data.subtotal >= Number(rate.free_shipping_threshold) ? 0 : Number(rate.fee);
      return [{ id: method.id, name: parsed.data.locale === "en" ? method.name_en : method.name_de, estimate: parsed.data.locale === "en" ? method.estimated_delivery_en : method.estimated_delivery_de, fee, currency: rate.currency }];
    });
    return NextResponse.json(methods);
  } catch (error) {
    const message = error instanceof Error && error.message === "SUPABASE_SERVER_NOT_CONFIGURED" ? "SHIPPING_NOT_CONFIGURED" : "SHIPPING_LOOKUP_FAILED";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUserClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const fieldsSchema = z.object({
  productId: z.uuid(),
  altDe: z.string().trim().min(2).max(240),
  altEn: z.string().trim().min(2).max(240),
});

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export async function POST(request: Request) {
  const userClient = await createUserClient().catch(() => null);
  const user = userClient ? (await userClient.auth.getUser()).data.user : null;
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const admin = createAdminClient();
  const { data: role } = await admin.from("user_roles").select("role").eq("user_id", user.id).single();
  if (role?.role !== "admin") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const body = await request.formData().catch(() => null);
  if (!body) return NextResponse.json({ error: "INVALID_FORM" }, { status: 400 });
  const parsed = fieldsSchema.safeParse({ productId: body.get("productId"), altDe: body.get("altDe"), altEn: body.get("altEn") });
  const file = body.get("file");
  if (!parsed.success || !(file instanceof File)) return NextResponse.json({ error: "INVALID_IMAGE_INPUT" }, { status: 400 });
  if (!allowedTypes.has(file.type) || file.size > 4 * 1024 * 1024) return NextResponse.json({ error: "UNSUPPORTED_IMAGE" }, { status: 415 });

  try {
    const image = await sharp(await file.arrayBuffer())
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 86, effort: 5 })
      .toBuffer();
    const path = `${parsed.data.productId}/${randomUUID()}.webp`;
    const bucket = admin.storage.from("product-images");
    const { error: uploadError } = await bucket.upload(path, image, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
    if (uploadError) throw uploadError;
    const { data: publicUrl } = bucket.getPublicUrl(path);
    const { error: recordError } = await admin.from("product_images").insert({ product_id: parsed.data.productId, url: publicUrl.publicUrl, alt_de: parsed.data.altDe, alt_en: parsed.data.altEn, sort_order: 0 });
    if (recordError) {
      await bucket.remove([path]);
      throw recordError;
    }
    return NextResponse.json({ url: publicUrl.publicUrl }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "IMAGE_UPLOAD_FAILED" }, { status: 500 });
  }
}

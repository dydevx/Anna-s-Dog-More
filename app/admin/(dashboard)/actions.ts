"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function updateProductAction(formData: FormData) {
  await requireAdmin();
  const parsed = z.object({ id: z.uuid(), category_id: z.uuid(), name_de: z.string().min(1), name_en: z.string().min(1), short_description_de: z.string().max(300), short_description_en: z.string().max(300), description_de: z.string().max(6000), description_en: z.string().max(6000), base_price: z.coerce.number().nonnegative(), currency: z.string().length(3), active: z.boolean(), featured: z.boolean() }).safeParse({ id: formData.get("id"), category_id: formData.get("category_id"), name_de: formData.get("name_de"), name_en: formData.get("name_en"), short_description_de: formData.get("short_description_de"), short_description_en: formData.get("short_description_en"), description_de: formData.get("description_de"), description_en: formData.get("description_en"), base_price: formData.get("base_price"), currency: String(formData.get("currency") ?? "").toUpperCase(), active: formData.get("active") === "on", featured: formData.get("featured") === "on" });
  if (!parsed.success) redirect(`/admin/products/${formData.get("id")}?error=invalid`);
  const { error } = await createAdminClient().from("products").update(parsed.data).eq("id", parsed.data.id);
  if (error) redirect(`/admin/products/${parsed.data.id}?error=save`);
  revalidatePath("/admin/products"); revalidatePath("/de/shop"); revalidatePath("/en/shop");
  redirect(`/admin/products/${parsed.data.id}?saved=1`);
}

export async function createProductAction(formData: FormData) {
  await requireAdmin();
  const parsed = z.object({ category_id: z.uuid(), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), name_de: z.string().min(1).max(180), name_en: z.string().min(1).max(180), product_type: z.enum(["simple", "configurable", "bundle"]), base_price: z.coerce.number().nonnegative(), currency: z.string().length(3) }).safeParse({ category_id: formData.get("category_id"), slug: formData.get("slug"), name_de: formData.get("name_de"), name_en: formData.get("name_en"), product_type: formData.get("product_type"), base_price: formData.get("base_price"), currency: String(formData.get("currency") ?? "").toUpperCase() });
  if (!parsed.success) redirect("/admin/products?error=invalid");
  const { data, error } = await createAdminClient().from("products").insert({ ...parsed.data, active: false, featured: false }).select("id").single();
  if (error || !data) redirect("/admin/products?error=save");
  revalidatePath("/admin/products");
  redirect(`/admin/products/${data.id}?created=1`);
}

export async function addVariantAction(formData: FormData) {
  await requireAdmin();
  const priceInput = String(formData.get("price") ?? "").trim();
  const parsed = z.object({ product_id: z.uuid(), sku: z.string().trim().min(1).max(100), article_number: z.string().trim().min(1).max(100), price: z.number().nonnegative().nullable(), currency: z.string().length(3), stock_quantity: z.coerce.number().int().nonnegative(), size: z.string().max(100), color: z.string().max(100), material: z.string().max(100), fabric: z.string().max(100), mattress_type: z.string().max(100), configuration: z.string().max(160), capacity: z.string().max(100), active: z.boolean() }).safeParse({ product_id: formData.get("productId"), sku: formData.get("sku"), article_number: formData.get("article_number"), price: priceInput === "" ? null : Number(priceInput), currency: String(formData.get("currency") ?? "").toUpperCase(), stock_quantity: formData.get("stock"), size: formData.get("size") ?? "", color: formData.get("color") ?? "", material: formData.get("material") ?? "", fabric: formData.get("fabric") ?? "", mattress_type: formData.get("mattress_type") ?? "", configuration: formData.get("configuration") ?? "", capacity: formData.get("capacity") ?? "", active: formData.get("active") === "on" });
  if (!parsed.success) redirect(`/admin/products/${formData.get("productId")}?error=variant`);
  const payload = { ...parsed.data, active: parsed.data.active && parsed.data.price !== null };
  const { error } = await createAdminClient().from("product_variants").insert(payload);
  if (error) redirect(`/admin/products/${parsed.data.product_id}?error=variant`);
  revalidatePath(`/admin/products/${parsed.data.product_id}`);
  redirect(`/admin/products/${parsed.data.product_id}?saved=1`);
}

export async function addProductImageAction(formData: FormData) {
  await requireAdmin();
  const parsed = z.object({ product_id: z.uuid(), url: z.url(), alt_de: z.string().min(2).max(240), alt_en: z.string().min(2).max(240) }).safeParse({ product_id: formData.get("productId"), url: formData.get("url"), alt_de: formData.get("alt_de"), alt_en: formData.get("alt_en") });
  if (!parsed.success) redirect(`/admin/products/${formData.get("productId")}?error=image`);
  const { error } = await createAdminClient().from("product_images").insert({ ...parsed.data, sort_order: 0 });
  if (error) redirect(`/admin/products/${parsed.data.product_id}?error=image`);
  revalidatePath(`/admin/products/${parsed.data.product_id}`);
  redirect(`/admin/products/${parsed.data.product_id}?saved=1`);
}

export async function createCategoryAction(formData: FormData) {
  await requireAdmin();
  const parsed = z.object({ slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), name_de: z.string().min(1).max(160), name_en: z.string().min(1).max(160), sort_order: z.coerce.number().int(), active: z.boolean() }).safeParse({ slug: formData.get("slug"), name_de: formData.get("name_de"), name_en: formData.get("name_en"), sort_order: formData.get("sort_order"), active: formData.get("active") === "on" });
  if (!parsed.success) redirect("/admin/categories?error=invalid");
  const { error } = await createAdminClient().from("categories").insert(parsed.data);
  if (error) redirect("/admin/categories?error=save");
  revalidatePath("/admin/categories"); revalidatePath("/de/shop"); revalidatePath("/en/shop");
  redirect("/admin/categories?saved=1");
}

export async function updateCategoryAction(formData: FormData) {
  await requireAdmin();
  const parsed = z.object({ id: z.uuid(), name_de: z.string().min(1).max(160), name_en: z.string().min(1).max(160), sort_order: z.coerce.number().int(), active: z.boolean() }).safeParse({ id: formData.get("id"), name_de: formData.get("name_de"), name_en: formData.get("name_en"), sort_order: formData.get("sort_order"), active: formData.get("active") === "on" });
  if (!parsed.success) redirect("/admin/categories?error=invalid");
  const { error } = await createAdminClient().from("categories").update(parsed.data).eq("id", parsed.data.id);
  if (error) redirect("/admin/categories?error=save");
  revalidatePath("/admin/categories"); revalidatePath("/de/shop"); revalidatePath("/en/shop");
  redirect("/admin/categories?saved=1");
}

export async function updateVariantStockAction(formData: FormData) {
  await requireAdmin();
  const parsed = z.object({ id: z.uuid(), productId: z.uuid(), stock: z.coerce.number().int().nonnegative(), active: z.boolean() }).safeParse({ id: formData.get("id"), productId: formData.get("productId"), stock: formData.get("stock"), active: formData.get("active") === "on" });
  if (!parsed.success) redirect(`/admin/products/${formData.get("productId")}?error=stock`);
  const admin = createAdminClient();
  const { data: before, error: readError } = await admin
    .from("product_variants")
    .select("stock_quantity,product_id")
    .eq("id", parsed.data.id)
    .eq("product_id", parsed.data.productId)
    .single();
  if (readError || !before) redirect(`/admin/products/${parsed.data.productId}?error=stock`);

  const { data: updated, error: updateError } = await admin
    .from("product_variants")
    .update({ stock_quantity: parsed.data.stock, active: parsed.data.active })
    .eq("id", parsed.data.id)
    .eq("product_id", parsed.data.productId)
    .select("id")
    .single();
  if (updateError || !updated) redirect(`/admin/products/${parsed.data.productId}?error=stock`);

  const delta = parsed.data.stock - Number(before.stock_quantity);
  if (delta) await admin.from("inventory_movements").insert({ variant_id: parsed.data.id, type: "adjustment", quantity: delta, reference: "admin-update" });
  revalidatePath(`/admin/products/${parsed.data.productId}`);
  revalidatePath("/admin/products");
  revalidatePath("/admin");
  revalidatePath("/[locale]", "layout");
  redirect(`/admin/products/${parsed.data.productId}?saved=stock`);
}

export async function updateOrderAction(formData: FormData) {
  await requireAdmin();
  const parsed = z.object({ id: z.uuid(), order_status: z.enum(["pending_payment","paid","processing","shipped","completed","cancelled","refunded"]), fulfillment_status: z.enum(["unfulfilled","processing","shipped","fulfilled","cancelled"]) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/admin/orders/${formData.get("id")}?error=invalid`);
  const { error } = await createAdminClient().from("orders").update({ order_status: parsed.data.order_status, fulfillment_status: parsed.data.fulfillment_status }).eq("id", parsed.data.id);
  if (error) redirect(`/admin/orders/${parsed.data.id}?error=save`);
  revalidatePath("/admin/orders"); revalidatePath(`/admin/orders/${parsed.data.id}`);
  redirect(`/admin/orders/${parsed.data.id}?saved=1`);
}

export async function createShippingAction(formData: FormData) {
  await requireAdmin();
  const parsed = z.object({ name: z.string().min(2), country: z.string().length(2), name_de: z.string().min(2), name_en: z.string().min(2), estimate_de: z.string().max(120), estimate_en: z.string().max(120), fee: z.coerce.number().nonnegative(), threshold: z.union([z.literal(""), z.coerce.number().nonnegative()]), currency: z.string().length(3) }).safeParse({ name: formData.get("zone_name"), country: String(formData.get("country") ?? "").toUpperCase(), name_de: formData.get("name_de"), name_en: formData.get("name_en"), estimate_de: formData.get("estimate_de"), estimate_en: formData.get("estimate_en"), fee: formData.get("fee"), threshold: formData.get("threshold"), currency: String(formData.get("currency") ?? "").toUpperCase() });
  if (!parsed.success) redirect("/admin/shipping?error=invalid");
  const admin = createAdminClient();
  const { data: zone, error: zoneError } = await admin.from("shipping_zones").insert({ name: parsed.data.name, country_codes: [parsed.data.country], active: true }).select("id").single();
  if (zoneError) redirect("/admin/shipping?error=save");
  const { data: method, error: methodError } = await admin.from("shipping_methods").insert({ zone_id: zone.id, name_de: parsed.data.name_de, name_en: parsed.data.name_en, estimated_delivery_de: parsed.data.estimate_de, estimated_delivery_en: parsed.data.estimate_en, active: true }).select("id").single();
  if (methodError) redirect("/admin/shipping?error=save");
  const { error: rateError } = await admin.from("shipping_rates").insert({ method_id: method.id, currency: parsed.data.currency, fee: parsed.data.fee, free_shipping_threshold: parsed.data.threshold === "" ? null : parsed.data.threshold, active: true });
  if (rateError) redirect("/admin/shipping?error=save");
  revalidatePath("/admin/shipping"); redirect("/admin/shipping?saved=1");
}

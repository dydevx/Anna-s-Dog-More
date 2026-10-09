import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { products } from "@/data/catalog";
import { toProductSummary } from "@/lib/catalog-summary";
import { adminPage } from "@/lib/admin-pagination";
import { getProductBySlug, getProductSummaries, searchProducts } from "@/lib/catalog";
import { CATALOG_CACHE_TAG } from "@/lib/catalog-cache";

const row = {
  id: "product-one", category_id: "category-one", slug: "test-product", name_de: "Testprodukt", name_en: "Test product",
  description_de: "Versteckter Suchbegriff", description_en: "Search description", product_type: "simple",
  base_price: 20, currency: "CHF", featured: true, active: true, categories: { slug: "spielen" },
  product_images: [
    { id: "image-one", url: "https://example.com/one.jpg", alt_de: "Bild", alt_en: "Image", sort_order: 0 },
    { id: "image-two", url: "https://example.com/two.jpg", alt_de: "Bild 2", alt_en: "Image 2", sort_order: 1 },
  ],
  product_variants: [{ id: "variant-one", sku: "SKU-123", article_number: "ARTICLE-123", price: 20, active: true, stock_quantity: 2, color: "Rose" }],
  product_attributes: [],
};

describe("catalog performance without lost product information", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://db.example.com");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "public-test-key");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify([row]), {
      headers: { "Content-Type": "application/json" },
    })));
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it("queries only the requested slug and retains every detail image and variant", async () => {
    const product = await getProductBySlug("test-product");
    const [input, options] = vi.mocked(fetch).mock.calls[0];
    const url = new URL(String(input));
    expect(url.searchParams.get("slug")).toBe("eq.test-product");
    expect(url.searchParams.has("product_images.limit")).toBe(false);
    expect(product?.images).toHaveLength(2);
    expect(product?.variants[0]).toMatchObject({ sku: "SKU-123", stockQuantity: 2 });
    expect(options).toMatchObject({ cache: "force-cache", next: { revalidate: 60, tags: [CATALOG_CACHE_TAG] } });
  });

  it("requests one image per listing product and does not send variant records to the browser", async () => {
    const summaries = await getProductSummaries();
    const url = new URL(String(vi.mocked(fetch).mock.calls[0][0]));
    expect(url.searchParams.get("product_images.limit")).toBe("1");
    expect(url.searchParams.get("select")).not.toContain("*");
    expect(url.searchParams.get("select")).not.toContain("description_de");
    expect(summaries[0].images).toHaveLength(1);
    expect(summaries[0].facets.color).toEqual(["Rose"]);
    expect(summaries[0].available).toBe(true);
    expect(summaries[0]).not.toHaveProperty("variants");
    expect(summaries[0]).not.toHaveProperty("description");
  });

  it("still searches descriptions and article numbers while returning small summaries", async () => {
    expect(await searchProducts("Suchbegriff")).toHaveLength(1);
    expect(await searchProducts("ARTICLE-123")).toHaveLength(1);
    expect((await searchProducts("ARTICLE-123"))[0]).not.toHaveProperty("variants");
    expect(await searchProducts("not-present")).toEqual([]);
  });

  it("preserves stock, from-price and facet behavior across all variant combinations", () => {
    const product = products.find((item) => item.variants.length > 0)!;
    const variant = product.variants[0];
    const summary = toProductSummary({
      ...product, attributes: { material: "Cotton, Wool" },
      variants: [
        { ...variant, active: false, price: 20, stockQuantity: 100, options: { material: "Cotton", color: "Rose" } },
        { ...variant, active: true, price: null, stockQuantity: 100, options: { size: "M" } },
        { ...variant, active: true, price: 20, stockQuantity: 0, options: { fabric: "Linen" } },
      ],
    });
    expect(summary.available).toBe(false);
    expect(summary.priceFrom).toBe(true);
    expect(summary.facets).toEqual({ material: ["Cotton", "Wool"], color: ["Rose"], size: ["M"], fabric: ["Linen"] });
    expect(toProductSummary({ ...product, variants: [{ ...variant, active: true, price: 20, stockQuantity: 1 }] }).available).toBe(true);
  });

  it("validates pagination before building database ranges", () => {
    for (const value of [undefined, "0", "-1", "NaN", "1.5", "100001", "99999999999999999999"]) expect(adminPage(value)).toBe(1);
    expect(adminPage("3")).toBe(3);
  });
});

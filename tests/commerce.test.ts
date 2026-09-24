import { describe, expect, it } from "vitest";
import { products } from "@/data/catalog";
import { formatMoney, toMinorUnits } from "@/lib/money";
import { checkoutSchema } from "@/lib/validation/checkout";
import { paymentMethodsForCurrency } from "@/lib/payments/methods";
import { getOptionGroups, resolveVariant } from "@/lib/product-variants";
import { clampPurchaseQuantity, getPurchasableLimit } from "@/lib/quantity";
import { ADMIN_LOGIN_EMAIL, resolveAdminLogin } from "@/lib/auth/admin-login";
import { getPasswordResetErrorKey } from "@/lib/auth/password-reset";
import type { ProductVariant } from "@/types/catalog";

const validCheckout = {
  locale: "de" as const,
  email: "kundin@example.ch",
  phone: "+41 44 000 00 00",
  shippingAddress: {
    firstName: "Anna",
    lastName: "Muster",
    street: "Leimbachstrasse",
    houseNumber: "200",
    postalCode: "8041",
    city: "Zürich",
    country: "ch",
  },
  billingAddress: {
    firstName: "Anna",
    lastName: "Muster",
    street: "Leimbachstrasse",
    houseNumber: "200",
    postalCode: "8041",
    city: "Zürich",
    country: "CH",
  },
  shippingMethodId: "30000000-0000-4000-8000-000000000001",
  items: [{ variantId: "20000000-0000-4000-8000-000000000001", quantity: 2 }],
};

describe("commerce primitives", () => {
  it("resolves the admin username without changing email logins", () => {
    expect(resolveAdminLogin("Admin")).toBe(ADMIN_LOGIN_EMAIL);
    expect(resolveAdminLogin(" admin ")).toBe(ADMIN_LOGIN_EMAIL);
    expect(resolveAdminLogin("owner@example.com")).toBe("owner@example.com");
  });

  it("maps password reset delivery errors to actionable messages", () => {
    expect(getPasswordResetErrorKey("over_email_send_rate_limit")).toBe("email-rate-limit");
    expect(getPasswordResetErrorKey("email_address_not_authorized")).toBe("email-not-authorized");
    expect(getPasswordResetErrorKey("unexpected_failure")).toBe("email-send");
  });

  it("converts display prices to provider minor units", () => {
    expect(toMinorUnits(14.95)).toBe(1495);
    expect(toMinorUnits(44.95)).toBe(4495);
  });

  it("renders currency from data instead of a hard-coded symbol", () => {
    expect(formatMoney(14.95, "CHF", "de")).toContain("CHF");
    expect(formatMoney(14.95, "CHF", "en")).toContain("CHF");
  });

  it("normalizes country codes and accepts a valid guest checkout", () => {
    const parsed = checkoutSchema.parse(validCheckout);
    expect(parsed.shippingAddress.country).toBe("CH");
    expect(parsed.items[0]).toEqual({
      variantId: "20000000-0000-4000-8000-000000000001",
      quantity: 2,
    });
  });

  it("rejects malformed variants and excessive quantities", () => {
    const parsed = checkoutSchema.safeParse({
      ...validCheckout,
      items: [{ variantId: "10700", quantity: 21 }],
    });
    expect(parsed.success).toBe(false);
  });

  it("preserves source SKU and article number for the Emma variant", () => {
    const emma = products.find((product) => product.slug === "emma-ente");
    expect(emma?.variants[0]).toMatchObject({ sku: "10700", articleNumber: "10700" });
  });

  it("represents product sets as bundles with child SKUs", () => {
    const set = products.find((product) => product.slug === "big-ocean");
    expect(set?.productType).toBe("bundle");
    expect(set?.bundleItems?.map((item) => item.childSku)).toEqual(["10600", "11710", "12000"]);
  });

  it("imports the requested dog bed collection without changing numeric prices", () => {
    const beds = products.filter((product) => product.categorySlug === "polsterbetten");
    const teddy = beds.find((product) => product.slug === "classic-hundebett-teddy");
    expect(beds).toHaveLength(18);
    expect(teddy).toMatchObject({ basePrice: 159.9, currency: "CHF" });
    expect(teddy?.variants[0]).toMatchObject({ sku: "4101S-505", price: 159.9, currency: "CHF", stockQuantity: 0 });
  });

  it("offers TWINT only when the order currency is CHF", () => {
    expect(paymentMethodsForCurrency("EUR")).toEqual(["card"]);
    expect(paymentMethodsForCurrency("CHF")).toEqual(["card", "twint"]);
  });

  it("resolves the exact size and color variant with its own price and SKU", () => {
    const variants: ProductVariant[] = [
      { id: "s-rose", sku: "S-ROSE", articleNumber: "S-ROSE", price: 159.9, currency: "CHF", stockQuantity: 2, active: true, options: { size: "S", color: "Rose" } },
      { id: "m-rose", sku: "M-ROSE", articleNumber: "M-ROSE", price: 199.9, currency: "CHF", stockQuantity: 1, active: true, options: { size: "M", color: "Rose" } },
      { id: "m-grey", sku: "M-GREY", articleNumber: "M-GREY", price: 209.9, currency: "CHF", stockQuantity: 3, active: true, options: { size: "M", color: "Grey" } },
    ];
    const optionKeys = getOptionGroups(variants).map(([key]) => key);
    const selected = resolveVariant(variants, variants[0], "size", "M", optionKeys);
    const grey = resolveVariant(variants, selected, "color", "Grey", optionKeys);
    expect(selected).toMatchObject({ id: "m-rose", price: 199.9, sku: "M-ROSE" });
    expect(grey).toMatchObject({ id: "m-grey", price: 209.9, sku: "M-GREY" });
  });

  it("does not silently fall back to a different option combination", () => {
    const variants: ProductVariant[] = [
      { id: "s-rose", sku: "S-ROSE", articleNumber: "S-ROSE", price: 159.9, currency: "CHF", stockQuantity: 0, active: true, options: { size: "S", color: "Rose" } },
      { id: "m-grey", sku: "M-GREY", articleNumber: "M-GREY", price: 209.9, currency: "CHF", stockQuantity: 0, active: true, options: { size: "M", color: "Grey" } },
    ];
    const optionKeys = getOptionGroups(variants).map(([key]) => key);
    expect(resolveVariant(variants, variants[0], "size", "M", optionKeys)).toBeUndefined();
  });

  it("keeps purchase quantity valid at zero-stock and stock-limit boundaries", () => {
    expect(getPurchasableLimit(0)).toBe(0);
    expect(clampPurchaseQuantity(2, 0)).toBe(1);
    expect(clampPurchaseQuantity(0, 5)).toBe(1);
    expect(clampPurchaseQuantity(6, 5)).toBe(5);
    expect(clampPurchaseQuantity(3, 5)).toBe(3);
  });
});

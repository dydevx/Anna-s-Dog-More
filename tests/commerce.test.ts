import { describe, expect, it } from "vitest";
import { products } from "@/data/catalog";
import { formatMoney, toMinorUnits } from "@/lib/money";
import { checkoutSchema } from "@/lib/validation/checkout";
import { paymentMethodsForCurrency } from "@/lib/payments/methods";

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
  it("converts display prices to provider minor units", () => {
    expect(toMinorUnits(14.95)).toBe(1495);
    expect(toMinorUnits(44.95)).toBe(4495);
  });

  it("renders currency from data instead of a hard-coded symbol", () => {
    expect(formatMoney(14.95, "EUR", "de")).toContain("14.95");
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

  it("keeps unknown variant prices unavailable instead of inventing them", () => {
    const bed = products.find((product) => product.slug === "classic-hundebett-teddy");
    expect(bed?.variants.every((variant) => variant.price === null && !variant.active)).toBe(true);
  });

  it("offers TWINT only when the order currency is CHF", () => {
    expect(paymentMethodsForCurrency("EUR")).toEqual(["card"]);
    expect(paymentMethodsForCurrency("CHF")).toEqual(["card", "twint"]);
  });
});

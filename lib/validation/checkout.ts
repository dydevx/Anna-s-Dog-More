import { z } from "zod";

const address = z.object({
  salutation: z.enum(["", "herr", "frau", "divers"]).optional().default(""),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  street: z.string().trim().min(2).max(120),
  houseNumber: z.string().trim().min(1).max(20),
  postalCode: z.string().trim().min(2).max(20),
  city: z.string().trim().min(2).max(100),
  country: z.string().regex(/^[a-z]{2}$/i).transform((value) => value.toUpperCase()).pipe(z.literal("CH")),
});

export const checkoutSchema = z.object({
  checkoutKey: z.uuid().optional(),
  locale: z.enum(["de", "en"]),
  email: z.email().max(180),
  phone: z.string().trim().max(40).optional().default(""),
  shippingAddress: address,
  billingAddress: address,
  shippingMethodId: z.uuid(),
  items: z.array(z.object({ variantId: z.uuid(), quantity: z.number().int().min(1).max(20) })).min(1).max(50)
    .refine((items) => new Set(items.map((item) => item.variantId)).size === items.length, "Duplicate variants are not allowed"),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

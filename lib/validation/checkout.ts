import { z } from "zod";

const address = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  street: z.string().trim().min(2).max(120),
  houseNumber: z.string().trim().min(1).max(20),
  postalCode: z.string().trim().min(2).max(20),
  city: z.string().trim().min(2).max(100),
  country: z.string().length(2).transform((value) => value.toUpperCase()),
});

export const checkoutSchema = z.object({
  locale: z.enum(["de", "en"]),
  email: z.email().max(180),
  phone: z.string().trim().max(40).optional().default(""),
  shippingAddress: address,
  billingAddress: address,
  shippingMethodId: z.uuid(),
  items: z.array(z.object({ variantId: z.uuid(), quantity: z.number().int().min(1).max(20) })).min(1).max(50),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

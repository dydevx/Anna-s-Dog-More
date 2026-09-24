import type { ProductVariant } from "@/types/catalog";

export const OPTION_ORDER = ["size", "color", "material", "fabric", "mattress", "configuration", "capacity"];

export function getOptionGroups(variants: ProductVariant[]) {
  const groups = new Map<string, string[]>();
  variants.forEach((variant) => Object.entries(variant.options).forEach(([key, value]) => {
    const current = groups.get(key) ?? [];
    if (!current.includes(value)) groups.set(key, [...current, value]);
  }));
  return [...groups.entries()]
    .filter(([, values]) => values.length > 1)
    .sort(([left], [right]) => OPTION_ORDER.indexOf(left) - OPTION_ORDER.indexOf(right));
}

export function resolveVariant(variants: ProductVariant[], configured: ProductVariant | undefined, key: string, value: string, optionKeys: string[]) {
  const requested = { ...(configured?.options ?? {}), [key]: value };
  return variants.find((variant) => optionKeys.every((optionKey) => variant.options[optionKey] === requested[optionKey]));
}

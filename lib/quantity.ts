export function getPurchasableLimit(stockQuantity: number | null | undefined) {
  if (!Number.isFinite(stockQuantity) || !stockQuantity || stockQuantity < 1) return 0;
  return Math.floor(stockQuantity);
}

export function clampPurchaseQuantity(quantity: number, stockQuantity: number | null | undefined) {
  const limit = getPurchasableLimit(stockQuantity);
  if (limit === 0 || !Number.isFinite(quantity)) return 1;
  return Math.min(limit, Math.max(1, Math.floor(quantity)));
}

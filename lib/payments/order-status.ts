export type PublicOrderStatus = {
  order_number: string;
  payment_status: string;
  grand_total: number;
  currency: string;
};

export function isPaymentTerminal(status: string) {
  return ["paid", "failed", "cancelled", "refunded", "partially_refunded"].includes(status);
}

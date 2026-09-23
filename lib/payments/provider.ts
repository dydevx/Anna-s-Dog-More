export type PaymentOrder = {
  id: string;
  publicToken: string;
  orderNumber: string;
  email: string;
  locale: "de" | "en";
  amount: number;
  currency: string;
  items: Array<{ name: string; description: string; unitPrice: number; quantity: number }>;
};

export type PaymentSession = {
  provider: string;
  providerPaymentId: string;
  redirectUrl: string;
  methods: string[];
};

export type VerifiedPaymentEvent = {
  eventId: string;
  eventType: string;
  providerPaymentId: string;
  orderId: string;
  method: string;
  amount: number;
  currency: string;
  paid: boolean;
  payloadHash: string;
};

export interface PaymentProvider {
  readonly name: string;
  createPayment(order: PaymentOrder): Promise<PaymentSession>;
  getPayment(providerPaymentId: string): Promise<{ status: string }>;
  refundPayment(providerPaymentId: string, amount?: number): Promise<{ id: string; status: string }>;
  verifyWebhook(rawBody: string, signature: string): Promise<VerifiedPaymentEvent | null>;
}

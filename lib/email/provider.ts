import "server-only";

export type OrderEmail = {
  to: string;
  locale: "de" | "en";
  orderNumber: string;
  total: string;
  paymentStatus: "awaiting_bank_transfer" | "paid";
  shippingAddress: string[];
  lines: Array<{ name: string; variant: string; sku: string; quantity: number; lineTotal: string }>;
};

export type BankTransferDetails = {
  accountHolder: string;
  iban: string;
  bic?: string;
};

export interface EmailProvider {
  sendOrderConfirmation(message: OrderEmail): Promise<void>;
  sendShopNotification(message: OrderEmail): Promise<void>;
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

export function getBankTransferDetails(): BankTransferDetails | null {
  const accountHolder = process.env.BANK_ACCOUNT_HOLDER?.trim();
  const iban = process.env.BANK_IBAN?.trim();
  const bic = process.env.BANK_BIC?.trim();
  if (!accountHolder || !iban) return null;
  return { accountHolder, iban, ...(bic ? { bic } : {}) };
}

class ResendEmailProvider implements EmailProvider {
  constructor(private readonly apiKey: string, private readonly from: string, private readonly shopEmail: string) {}

  private async send(to: string, subject: string, html: string, idempotencyKey: string) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}`, "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({ from: this.from, to: [to], subject, html }),
    });
    if (!response.ok) throw new Error(`EMAIL_PROVIDER_FAILED:${response.status}`);
  }

  private body(message: OrderEmail, shopCopy = false) {
    const de = message.locale === "de";
    const awaitingTransfer = message.paymentStatus === "awaiting_bank_transfer";
    const heading = shopCopy ? `${awaitingTransfer ? "Neue Bestellung" : "Neue bezahlte Bestellung"} ${message.orderNumber}` : de ? `Vielen Dank für Ihre Bestellung ${message.orderNumber}` : `Thank you for your order ${message.orderNumber}`;
    const intro = shopCopy ? "" : awaitingTransfer
      ? `<p>${de ? "Bitte überweisen Sie den Gesamtbetrag mit Ihrer Bestellnummer als Zahlungsreferenz. Der Versand erfolgt nach Eingang der vollständigen Zahlung." : "Please transfer the total amount using your order number as the payment reference. Your order will be shipped after full payment is received."}</p>`
      : `<p>${de ? "Ihre Zahlung wurde bestätigt." : "Your payment has been confirmed."}</p>`;
    const itemRows = message.lines.map((line) => `<tr><td style="padding:10px 0;border-bottom:1px solid #ddd3c8"><strong>${escapeHtml(line.name)}</strong><br><small>${escapeHtml(line.variant || line.sku)} · SKU ${escapeHtml(line.sku)}</small></td><td style="padding:10px;text-align:center;border-bottom:1px solid #ddd3c8">${line.quantity}</td><td style="padding:10px 0;text-align:right;border-bottom:1px solid #ddd3c8">${escapeHtml(line.lineTotal)}</td></tr>`).join("");
    const bank = awaitingTransfer ? getBankTransferDetails() : null;
    if (awaitingTransfer && !bank) throw new Error("BANK_TRANSFER_DETAILS_NOT_CONFIGURED");
    const bankSection = bank ? `<h2 style="font-size:15px">${de ? "Bankangaben" : "Bank details"}</h2><p>${de ? "Kontoinhaberin" : "Account holder"}: ${escapeHtml(bank.accountHolder)}<br>IBAN: ${escapeHtml(bank.iban)}${bank.bic ? `<br>BIC/SWIFT: ${escapeHtml(bank.bic)}` : ""}<br>${de ? "Zahlungsreferenz" : "Payment reference"}: ${escapeHtml(message.orderNumber)}</p>` : "";
    return `<div style="font-family:Arial,sans-serif;color:#1e1e1e;background:#f8f3ec;padding:32px"><div style="max-width:640px;margin:auto;background:#fff;padding:32px"><p style="letter-spacing:.16em;font-size:12px">ANNA'S DOG &amp; MORE</p><h1 style="font-family:Georgia,serif;font-weight:400">${escapeHtml(heading)}</h1>${intro}<table style="width:100%;border-collapse:collapse">${itemRows}</table><p style="font-size:18px;text-align:right"><strong>${de ? "Gesamt" : "Total"}: ${escapeHtml(message.total)}</strong></p>${bankSection}<h2 style="font-size:15px">${de ? "Lieferadresse" : "Shipping address"}</h2><p>${message.shippingAddress.map(escapeHtml).join("<br>")}</p><p style="color:#6f675f;font-size:13px">Leimbachstrasse 200 · 8041 Zürich · Schweiz</p></div></div>`;
  }

  async sendOrderConfirmation(message: OrderEmail) {
    const subject = message.locale === "de" ? `Bestellbestätigung ${message.orderNumber}` : `Order confirmation ${message.orderNumber}`;
    await this.send(message.to, subject, this.body(message), `order-confirmation/customer/${message.orderNumber}/${message.paymentStatus}`);
  }

  async sendShopNotification(message: OrderEmail) {
    const subject = `${message.paymentStatus === "awaiting_bank_transfer" ? "Neue Bestellung" : "Neue bezahlte Bestellung"} ${message.orderNumber}`;
    await this.send(this.shopEmail, subject, this.body(message, true), `order-confirmation/shop/${message.orderNumber}/${message.paymentStatus}`);
  }
}

export function getEmailProvider(): EmailProvider | null {
  if (!process.env.EMAIL_PROVIDER) return null;
  if (process.env.EMAIL_PROVIDER !== "resend") throw new Error("EMAIL_PROVIDER_UNSUPPORTED");
  const apiKey = process.env.EMAIL_API_KEY;
  const from = process.env.ORDER_FROM_EMAIL;
  const shopEmail = process.env.SHOP_ORDER_EMAIL;
  if (!apiKey || !from || !shopEmail) throw new Error("EMAIL_PROVIDER_NOT_CONFIGURED");
  return new ResendEmailProvider(apiKey, from, shopEmail);
}

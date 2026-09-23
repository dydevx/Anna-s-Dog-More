import "server-only";

export type OrderEmail = {
  to: string;
  locale: "de" | "en";
  orderNumber: string;
  total: string;
  shippingAddress: string[];
  lines: Array<{ name: string; variant: string; sku: string; quantity: number; lineTotal: string }>;
};

export interface EmailProvider {
  sendOrderPaid(message: OrderEmail): Promise<void>;
  sendShopNotification(message: OrderEmail): Promise<void>;
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
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
    const heading = shopCopy ? `Neue bezahlte Bestellung ${message.orderNumber}` : de ? `Vielen Dank für Ihre Bestellung ${message.orderNumber}` : `Thank you for your order ${message.orderNumber}`;
    const itemRows = message.lines.map((line) => `<tr><td style="padding:10px 0;border-bottom:1px solid #ddd3c8"><strong>${escapeHtml(line.name)}</strong><br><small>${escapeHtml(line.variant || line.sku)} · SKU ${escapeHtml(line.sku)}</small></td><td style="padding:10px;text-align:center;border-bottom:1px solid #ddd3c8">${line.quantity}</td><td style="padding:10px 0;text-align:right;border-bottom:1px solid #ddd3c8">${escapeHtml(line.lineTotal)}</td></tr>`).join("");
    return `<div style="font-family:Arial,sans-serif;color:#1e1e1e;background:#f8f3ec;padding:32px"><div style="max-width:640px;margin:auto;background:#fff;padding:32px"><p style="letter-spacing:.16em;font-size:12px">ANNA'S DOG &amp; MORE</p><h1 style="font-family:Georgia,serif;font-weight:400">${escapeHtml(heading)}</h1><table style="width:100%;border-collapse:collapse">${itemRows}</table><p style="font-size:18px;text-align:right"><strong>${de ? "Gesamt" : "Total"}: ${escapeHtml(message.total)}</strong></p><h2 style="font-size:15px">${de ? "Lieferadresse" : "Shipping address"}</h2><p>${message.shippingAddress.map(escapeHtml).join("<br>")}</p><p style="color:#6f675f;font-size:13px">Leimbachstrasse 200 · 8041 Zürich · Switzerland</p></div></div>`;
  }

  async sendOrderPaid(message: OrderEmail) {
    const subject = message.locale === "de" ? `Bestellbestätigung ${message.orderNumber}` : `Order confirmation ${message.orderNumber}`;
    await this.send(message.to, subject, this.body(message), `order-paid/customer/${message.orderNumber}`);
  }

  async sendShopNotification(message: OrderEmail) {
    await this.send(this.shopEmail, `Neue bezahlte Bestellung ${message.orderNumber}`, this.body(message, true), `order-paid/shop/${message.orderNumber}`);
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

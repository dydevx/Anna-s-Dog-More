"use client";

import { FormEvent, useState } from "react";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react";
import type { Locale } from "@/types/catalog";

export function ContactForm({ locale }: { locale: Locale }) {
  const de = locale === "de";
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale, name: form.get("name"), email: form.get("email"), subject: form.get("subject"), message: form.get("message"), website: form.get("website") }),
    }).catch(() => null);
    if (response?.ok) {
      event.currentTarget.reset();
      setStatus("sent");
    } else {
      setStatus("error");
    }
  }

  return <form className="contact-form" onSubmit={submit}>
    <h2>{de ? "Schreiben Sie uns" : "Send us a message"}</h2>
    <div className="contact-form-grid">
      <label>{de ? "Name" : "Name"}<input name="name" autoComplete="name" required minLength={2} /></label>
      <label>{de ? "E-Mail" : "Email"}<input name="email" type="email" autoComplete="email" required /></label>
      <label className="contact-form-wide">{de ? "Betreff" : "Subject"}<input name="subject" required minLength={3} /></label>
      <label className="contact-form-wide">{de ? "Nachricht" : "Message"}<textarea name="message" rows={6} required minLength={10} /></label>
      <label className="contact-honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
    </div>
    {status === "sent" && <p className="contact-status success" role="status"><CheckCircle size={19} />{de ? "Vielen Dank. Ihre Nachricht ist bei uns angekommen." : "Thank you. Your message has reached us."}</p>}
    {status === "error" && <p className="contact-status error" role="alert"><WarningCircle size={19} />{de ? "Die Nachricht konnte nicht gesendet werden. Bitte versuchen Sie es später erneut." : "Your message could not be sent. Please try again later."}</p>}
    <button className="button primary-button" type="submit" disabled={status === "sending"}>{status === "sending" ? (de ? "Wird gesendet..." : "Sending...") : (de ? "Nachricht senden" : "Send message")}</button>
  </form>;
}

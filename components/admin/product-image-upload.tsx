"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function ProductImageUpload({ productId }: { productId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "uploading") return;
    setStatus("uploading");
    const response = await fetch("/api/admin/product-images", { method: "POST", body: new FormData(event.currentTarget) }).catch(() => null);
    if (!response?.ok) {
      setStatus("error");
      return;
    }
    event.currentTarget.reset();
    setStatus("done");
    router.refresh();
  }

  return <form className="admin-form-grid" onSubmit={submit}>
    <input type="hidden" name="productId" value={productId} />
    <label className="span-2">Bilddatei<input name="file" type="file" accept="image/jpeg,image/png,image/webp,image/avif" required /></label>
    <label>Alt-Text DE<input name="altDe" required maxLength={240} /></label>
    <label>Alt-Text EN<input name="altEn" required maxLength={240} /></label>
    <button className="button secondary-button" type="submit" disabled={status === "uploading"}>{status === "uploading" ? "Wird optimiert..." : "Bild optimieren & hochladen"}</button>
    <p className="admin-upload-status" role="status">{status === "done" ? "Bild wurde als optimiertes WebP gespeichert." : status === "error" ? "Upload fehlgeschlagen. Datei, Rechte und Storage-Konfiguration prüfen." : "JPEG, PNG, WebP oder AVIF; maximal 4 MB."}</p>
  </form>;
}

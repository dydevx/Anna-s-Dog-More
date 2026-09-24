"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ArrowsOut, X } from "@phosphor-icons/react";
import type { Locale, ProductImage } from "@/types/catalog";

export function ProductGallery({ images, locale }: { images: ProductImage[]; locale: Locale }) {
  const [active, setActive] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const current = images[active] ?? images[0];

  return <div className="product-gallery">
    <button className="product-main-image" type="button" onClick={() => dialogRef.current?.showModal()} aria-label={locale === "de" ? "Produktbild vergrössern" : "Enlarge product image"}>
      <Image src={current.url} alt={current.alt[locale]} fill priority sizes="(max-width: 900px) 100vw, 58vw" />
      <span className="zoom-hint"><ArrowsOut size={17} />{locale === "de" ? "Vergrössern" : "Enlarge"}</span>
    </button>
    {images.length > 1 && <div className="product-thumbnails" aria-label={locale === "de" ? "Produktbilder" : "Product images"}>{images.map((item, index) => <button className={active === index ? "active" : ""} type="button" key={item.id} onClick={() => setActive(index)} aria-label={`${locale === "de" ? "Bild" : "Image"} ${index + 1}`} aria-pressed={active === index}><Image src={item.url} alt="" width={112} height={112} sizes="112px" /></button>)}</div>}
    <dialog className="image-lightbox" ref={dialogRef} onClick={(event) => { if (event.target === event.currentTarget) dialogRef.current?.close(); }}>
      <button className="icon-button lightbox-close" type="button" onClick={() => dialogRef.current?.close()} aria-label={locale === "de" ? "Bild schliessen" : "Close image"}><X size={24} /></button>
      <div><Image src={current.url} alt={current.alt[locale]} fill sizes="100vw" quality={90} /></div>
    </dialog>
  </div>;
}

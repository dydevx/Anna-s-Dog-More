import type { Metadata } from "next";
import { Bodoni_Moda, Manrope } from "next/font/google";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const bodyFont = Manrope({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const displayFont = Bodoni_Moda({ subsets: ["latin"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: { default: "Anna's Dog & More", template: "%s | Anna's Dog & More" },
  description: "Premium LABONI products for dogs and their people in Zürich.",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="de" className={`${bodyFont.variable} ${displayFont.variable}`}><body>{children}</body></html>;
}

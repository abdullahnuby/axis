import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";


export const metadata: Metadata = {
  title: { default: "AXIS — مجتمع المهندسين", template: "%s | AXIS" },
  description: "مجتمع مهني مغلق للمهندسين، يفتح بعد مراجعة العضوية يدويًا.",
  applicationName: "AXIS",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="ar" dir="rtl"><head><link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/><link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet"/></head><body>{children}</body></html>;
}

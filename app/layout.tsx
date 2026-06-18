import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import { getMetadataBase } from "@/lib/site";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter"
});

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: "Resilience Test Series",
  description: "Modern CA Final online test series with refundable deposit discipline and evaluation support.",
  verification: {
    google: "XHRBW8vVE5zgL1Mi5jnZ1pAVx3m8Ix-kXYN_pdFY63g"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans text-slate-900 antialiased">{children}</body>
    </html>
  );
}

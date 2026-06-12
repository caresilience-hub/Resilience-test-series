import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Resilience Test Series",
  description: "Modern CA Final online test series with refundable deposit discipline and evaluation support."
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      lang="en"
      style={
        {
          ["--font-manrope" as any]: '"Inter", "Segoe UI", Arial, sans-serif',
          ["--font-cormorant" as any]: '"Georgia", "Times New Roman", serif'
        } as any
      }
    >
      <body className="font-sans text-ink-900 antialiased">{children}</body>
    </html>
  );
}

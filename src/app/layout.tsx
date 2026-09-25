import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hauling Guard — Monitoring Garansi Hauling Road",
  description: "Dashboard monitoring pekerjaan perawatan hauling road dalam masa garansi/retensi.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import { CartProvider } from "@/context/CartContext";
import { CartDrawer } from "@/components/cart/CartDrawer";
import "./globals.css";

export const metadata: Metadata = {
  title: "BHARAT | Curated Menswear & Tailoring",
  description: "Editorial menswear craft, structured silhouettes, and uncompromised textiles.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-canvas text-ink antialiased">
        <CartProvider>
          {children}
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}

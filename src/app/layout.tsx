import type { Metadata } from "next";
import { Bebas_Neue, Inter } from "next/font/google";
import { Suspense } from "react";

import { ShopifyAnalytics } from "@/components/analytics/shopify-analytics";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { CartLoader } from "@/components/cart/cart-loader";
import { CartProvider } from "@/components/cart/cart-provider";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { SubscribePopup } from "@/components/marketing/subscribe-popup";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const bebas = Bebas_Neue({
  variable: "--font-bebas",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://litwalls.in"),
  title: {
    default: "Litwalls — Posters that make your walls talk",
    template: "%s | Litwalls",
  },
  description:
    "Museum-grade 300gsm matte posters of the movies, music and anime you love. Free shipping over ₹499, 7-day easy returns.",
  openGraph: {
    type: "website",
    siteName: "Litwalls",
    locale: "en_IN",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${bebas.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        {/* useSearchParams opts its subtree out of prerendering, so the
            boundary keeps that deopt from reaching the rest of the layout. */}
        <Suspense fallback={null}>
          <ShopifyAnalytics />
        </Suspense>
        <CartProvider>
          <CartLoader />
          <AnnouncementBar />
          <Header />
          <main className="flex flex-1 flex-col">{children}</main>
          <Footer />
          <CartDrawer />
          <SubscribePopup />
        </CartProvider>
      </body>
    </html>
  );
}

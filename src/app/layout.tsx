import type { Metadata } from "next";
import { Bebas_Neue, Inter } from "next/font/google";
import { Suspense } from "react";

import { MetaPixel } from "@/components/analytics/meta-pixel";
import { ShopifyAnalytics } from "@/components/analytics/shopify-analytics";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { CartLoader } from "@/components/cart/cart-loader";
import { CartProvider } from "@/components/cart/cart-provider";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { SubscribePopup } from "@/components/marketing/subscribe-popup";
import { getCollections } from "@/lib/shopify/products";
import "./globals.css";

/** Same list Footer fetches — cached, so this is a cache hit, not a second request. */
const NAV_COLLECTION_COUNT = 12;

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
    "300gsm matte posters of the movies, music and anime you love. From ₹79, free delivery over ₹349, free replacement on damage.",
  openGraph: {
    type: "website",
    siteName: "Litwalls",
    locale: "en_IN",
  },
  // Proves domain ownership to Meta Business Manager — required once for the
  // pixel's domain to be verified there, unrelated to the pixel script itself.
  verification: process.env.META_DOMAIN_VERIFICATION
    ? { other: { "facebook-domain-verification": process.env.META_DOMAIN_VERIFICATION } }
    : undefined,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const collections = await getCollections(NAV_COLLECTION_COUNT);

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
          <MetaPixel />
        </Suspense>
        <CartProvider>
          <CartLoader />
          <AnnouncementBar />
          <Header collections={collections} />
          <main className="flex flex-1 flex-col">{children}</main>
          <Footer />
          <CartDrawer />
          <SubscribePopup />
        </CartProvider>
      </body>
    </html>
  );
}

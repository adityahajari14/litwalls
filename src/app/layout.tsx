import type { Metadata } from "next";
import { Bebas_Neue, Inter } from "next/font/google";
import { Suspense } from "react";

import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { MetaPixel } from "@/components/analytics/meta-pixel";
import { ShopifyAnalytics } from "@/components/analytics/shopify-analytics";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { CartLoader } from "@/components/cart/cart-loader";
import { CartProvider } from "@/components/cart/cart-provider";
import { FastrrScript } from "@/components/checkout/fastrr-script";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { SubscribePopup } from "@/components/marketing/subscribe-popup";
import { MotionEnhancements } from "@/components/motion-enhancements";
import { getCollections } from "@/lib/shopify/products";
import { SITE_URL } from "@/lib/site";
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
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Litwalls — Posters that make your walls talk",
    template: "%s | Litwalls",
  },
  description:
    "300gsm matte posters of everything you love. From ₹79, free delivery over ₹349, free replacement on damage.",
  openGraph: {
    type: "website",
    siteName: "Litwalls",
    locale: "en_IN",
  },
  // The card itself comes from app/opengraph-image.tsx; this only says which
  // shape X should render it in. Without it a share collapses to the small
  // thumbnail layout and the poster becomes a 120px square.
  twitter: {
    card: "summary_large_image",
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
        {/* Thirteen tab stops — announcement bar, logo, four nav items, the
            collections submenu, three icon buttons — sit between the top of
            the page and the first product. This skips all of them. */}
        <a
          href="#main"
          className="sr-only rounded-card focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-70 focus:bg-ink-950 focus:px-4 focus:py-2.5 focus:text-sm focus:font-medium focus:text-white"
        >
          Skip to content
        </a>
        {/* useSearchParams opts its subtree out of prerendering, so the
            boundary keeps that deopt from reaching the rest of the layout. */}
        <Suspense fallback={null}>
          <ShopifyAnalytics />
          <MetaPixel />
          <GoogleAnalytics />
        </Suspense>
        <CartProvider>
          <CartLoader />
          <AnnouncementBar />
          <Header collections={collections} />
          <main id="main" className="flex flex-1 flex-col">
            {children}
          </main>
          <Footer />
          <CartDrawer />
          <SubscribePopup />
          <FastrrScript />
          <MotionEnhancements />
        </CartProvider>
      </body>
    </html>
  );
}

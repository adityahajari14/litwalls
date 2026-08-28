export const MAIN_NAV = [
  { label: "All Products", href: "/products" },
  { label: "Collections", href: "/collections" },
  { label: "Custom", href: "/custom" },
  { label: "About", href: "/about" },
] as const;

/**
 * The footer's "Shop" group is built from live Shopify collections instead of
 * hardcoded here — see Footer. Hardcoding collection handles let this drift
 * out of sync with the store (it linked to /collections/anime and
 * /collections/cars, neither of which existed) with no build-time signal that
 * anything was wrong.
 */
export const FOOTER_NAV = [
  {
    title: "Help",
    links: [
      { label: "Track your order", href: "/account" },
      { label: "Shipping", href: "/shipping" },
      { label: "Returns & refunds", href: "/returns" },
      { label: "Contact us", href: "/contact" },
      { label: "FAQ", href: "/#faq" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Litwalls", href: "/about" },
      { label: "Custom posters", href: "/custom" },
      { label: "Bulk & corporate", href: "/bulk" },
      { label: "Privacy policy", href: "/privacy" },
      { label: "Terms of service", href: "/terms" },
    ],
  },
] as const;

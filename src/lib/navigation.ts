export const MAIN_NAV = [
  { label: "All Products", href: "/products" },
  { label: "Custom", href: "/custom" },
  { label: "About", href: "/about" },
  { label: "Reviews", href: "/reviews" },
] as const;

export const FOOTER_NAV = [
  {
    title: "Shop",
    links: [
      { label: "All posters", href: "/products" },
      { label: "Marvel", href: "/collections/marvel" },
      { label: "Anime", href: "/collections/anime" },
      { label: "Music", href: "/collections/music" },
      { label: "Cars", href: "/collections/cars" },
    ],
  },
  {
    title: "Help",
    links: [
      { label: "Track your order", href: "/orders" },
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

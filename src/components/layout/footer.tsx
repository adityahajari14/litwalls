import Image from "next/image";
import Link from "next/link";

import { InstagramIcon, TwitterIcon } from "@/components/icons";
import { SubscribeForm } from "@/components/marketing/subscribe-form";
import { Container } from "@/components/ui/container";
import { SUBSCRIBE_DISCOUNT_PERCENT } from "@/lib/marketing";
import { FOOTER_NAV } from "@/lib/navigation";
import { getCollections } from "@/lib/shopify/products";

const PAYMENT_METHODS = ["UPI", "Visa", "Mastercard", "RuPay", "Net Banking"];

/** Enough to fill the column without it outgrowing "Help" and "Company" next to it. */
const FOOTER_COLLECTION_COUNT = 4;

export async function Footer() {
  // One extra than the footer shows, so we know whether "See all" earns its
  // place without a second round trip to Shopify.
  const collections = await getCollections(FOOTER_COLLECTION_COUNT + 1);
  const hasMore = collections.length > FOOTER_COLLECTION_COUNT;

  const shopGroup = {
    title: "Shop",
    links: [
      { label: "All posters", href: "/products" },
      ...collections.slice(0, FOOTER_COLLECTION_COUNT).map((collection) => ({
        label: collection.title,
        href: `/collections/${collection.handle}`,
      })),
      ...(hasMore
        ? [{ label: "See all collections", href: "/collections" }]
        : []),
    ],
  };

  return (
    <footer className="mt-24 border-t border-ink-200 bg-white">
      <Container className="py-14 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_2fr]">
          <div className="max-w-sm">
            <Image
              src="/brand/logo.png"
              alt="Litwalls"
              width={156}
              height={75}
              className="h-9 w-auto"
            />
            <p className="mt-4 text-sm text-ink-600 text-pretty">
              Museum-grade posters of the movies, music and anime you love.
              Printed in India, shipped to your wall.
            </p>

            <div className="mt-6">
              <label
                htmlFor="newsletter"
                className="text-sm font-medium text-ink-900"
              >
                Get {SUBSCRIBE_DISCOUNT_PERCENT}% off your first order
              </label>
              <SubscribeForm id="newsletter" className="mt-2" />
            </div>

            <div className="mt-6 flex gap-2">
              <Link
                href="https://instagram.com"
                aria-label="Litwalls on Instagram"
                className="grid size-10 place-items-center rounded-full border border-ink-200 text-ink-600 transition-colors hover:border-ink-950 hover:text-ink-950"
              >
                <InstagramIcon className="size-5" />
              </Link>
              <Link
                href="https://x.com"
                aria-label="Litwalls on X"
                className="grid size-10 place-items-center rounded-full border border-ink-200 text-ink-600 transition-colors hover:border-ink-950 hover:text-ink-950"
              >
                <TwitterIcon className="size-5" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {[shopGroup, ...FOOTER_NAV].map((group) => (
              <nav key={group.title} aria-label={group.title}>
                <h3 className="text-sm font-semibold text-ink-950">
                  {group.title}
                </h3>
                <ul className="mt-4 space-y-3">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-ink-600 transition-colors hover:text-brand-600"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-ink-200 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-500">
            © {new Date().getFullYear()} Litwalls. All rights reserved.
          </p>
          <ul className="flex flex-wrap items-center gap-2">
            {PAYMENT_METHODS.map((method) => (
              <li
                key={method}
                className="rounded-md border border-ink-200 px-2.5 py-1 text-xs font-medium text-ink-500"
              >
                {method}
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </footer>
  );
}

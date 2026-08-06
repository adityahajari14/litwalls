import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ProductViewTracker } from "@/components/analytics/product-view";
import { AddToCart } from "@/components/product/add-to-cart";
import { BuyReassurance } from "@/components/product/buy-reassurance";
import { Gallery } from "@/components/product/gallery";
import { ProductGridSection } from "@/components/home/product-grid-section";
import { Accordion } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { Price } from "@/components/ui/price";
import { LeafIcon, ReturnIcon, TruckIcon } from "@/components/icons";
import { discountPercent } from "@/lib/money";
import {
  getProduct,
  getProductHandles,
  getProducts,
  getVariantQuantities,
} from "@/lib/shopify/products";
import { defaultVariant, hasSizeChoice } from "@/lib/shopify/types";

function Breadcrumb({ productType, title }: { productType: string; title: string }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6 hidden lg:block">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-ink-500">
        <li>
          <Link href="/" className="transition-colors hover:text-ink-900">
            Home
          </Link>
        </li>
        <li aria-hidden className="text-ink-300">
          /
        </li>
        <li>
          <Link href="/products" className="transition-colors hover:text-ink-900">
            All posters
          </Link>
        </li>
        {productType ? (
          <>
            <li aria-hidden className="text-ink-300">
              /
            </li>
            <li className="text-ink-700">{productType}</li>
          </>
        ) : null}
        <li aria-hidden className="text-ink-300">
          /
        </li>
        <li aria-current="page" className="truncate text-ink-900">
          {title}
        </li>
      </ol>
    </nav>
  );
}

type Params = { handle: string };

export async function generateStaticParams() {
  const handles = await getProductHandles();
  return handles.map((handle) => ({ handle }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { handle } = await params;
  const product = await getProduct(handle);

  if (!product) return { title: "Product not found" };

  const image = product.featuredImage;

  return {
    title: product.title,
    description: product.description.slice(0, 160),
    openGraph: image
      ? {
          images: [
            {
              url: image.url,
              width: image.width,
              height: image.height,
              alt: image.altText ?? product.title,
            },
          ],
        }
      : undefined,
  };
}

const SHIPPING_FAQ = [
  {
    question: "Paper & printing",
    answer:
      "Printed on 300gsm museum-grade matte paper with pigment inks. The matte finish means no glare from lamps or windows, and the stock is thick enough to hang flat without curling.",
  },
  {
    question: "Shipping",
    answer:
      "Dispatched within 24 hours, rolled in a rigid tube — never folded. Metro cities receive in 3–4 days, the rest of India in 4–7. Free over ₹499, otherwise a flat ₹49.",
  },
  {
    question: "Returns",
    answer:
      "If it arrives damaged, send us a photo within 7 days and we'll ship a replacement free. No return shipping, no arguing.",
  },
];

const HIGHLIGHTS = [
  { icon: LeafIcon, text: "300gsm museum-grade matte" },
  { icon: TruckIcon, text: "Ships in 24 hours, rolled in a tube" },
  { icon: ReturnIcon, text: "7-day replacement if damaged" },
];

async function RelatedProducts({ handle }: { handle: string }) {
  const products = await getProducts({ first: 5 });
  const related = products.filter((product) => product.handle !== handle).slice(0, 4);

  if (related.length === 0) return null;

  return (
    <ProductGridSection
      title="You might also like"
      subtitle="More prints from the same shelf."
      href="/products"
      products={related}
    />
  );
}

export default async function ProductPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { handle } = await params;
  const product = await getProduct(handle);

  if (!product) notFound();

  const variant = defaultVariant(product);
  const price = variant?.price ?? product.priceRange.minVariantPrice;
  const compareAt =
    variant?.compareAtPrice ?? product.compareAtPriceRange.minVariantPrice;
  const percent = discountPercent(price, compareAt);
  const available = product.availableForSale && (variant?.availableForSale ?? false);

  // Fetched separately from the product so a store without inventory-read
  // access still renders the page — see getVariantQuantityAvailable.
  //
  // Every variant, not just the default: stock differs per size, and the
  // quantity stepper caps against whichever one is selected. Batched into one
  // request — asking per variant multiplies every page's round trips by the
  // number of sizes, which is enough to get a full build's connections reset.
  const quantityBySize = await getVariantQuantities(
    product.variants.nodes.map((node) => node.id),
  );

  const maxQuantity = variant ? (quantityBySize[variant.id] ?? null) : null;

  // Feeds Google's product rich results — price and availability show up in
  // the SERP, which qualifies the click before it costs anything. Deliberately
  // omits aggregateRating: we have no real reviews, and marking up ratings we
  // don't have is exactly what earns a manual action.
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description,
    image: product.images.nodes.map((image) => image.url),
    sku: variant?.id ?? product.id,
    brand: { "@type": "Brand", name: product.vendor || "Litwalls" },
    // AggregateOffer once sizes are priced differently. A single Offer would
    // advertise the A5 price for a listing whose A3 costs three times as much,
    // and Google flags a mismatch between marked-up and displayed price.
    offers: hasSizeChoice(product)
      ? {
          "@type": "AggregateOffer",
          url: `https://litwalls.in/products/${product.handle}`,
          priceCurrency: product.priceRange.minVariantPrice.currencyCode,
          lowPrice: product.priceRange.minVariantPrice.amount,
          highPrice: product.priceRange.maxVariantPrice.amount,
          offerCount: product.variants.nodes.length,
          availability: available
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
        }
      : {
          "@type": "Offer",
          url: `https://litwalls.in/products/${product.handle}`,
          price: price.amount,
          priceCurrency: price.currencyCode,
          availability: available
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
        },
  };

  return (
    <>
      <ProductViewTracker product={product} variant={variant} />

      <script
        type="application/ld+json"
        // Values come from Shopify, not user input, and JSON.stringify escapes
        // the payload — but the tag still must not be interpolated by hand.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />

      <Container className="py-8 lg:py-12">
        <Breadcrumb productType={product.productType} title={product.title} />

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <Gallery
            images={product.images.nodes}
            title={product.title}
            badge={
              !available ? (
                <Badge tone="neutral">Sold out</Badge>
              ) : percent > 0 ? (
                <Badge tone="sale">{percent}% off</Badge>
              ) : undefined
            }
          />

          <div className="lg:py-4">
            {product.productType ? (
              <p className="text-xs font-semibold tracking-[0.18em] text-brand-600 uppercase">
                {product.productType}
              </p>
            ) : null}

            <h1 className="mt-3 font-display text-4xl text-ink-950 sm:text-5xl">
              {product.title}
            </h1>

            {/* Price lives inside AddToCart because it must track the selected
                size. Rendering it here as a server value would leave it
                showing the cheapest variant's price after the customer picks
                a bigger one — the exact mismatch that erodes trust at the
                moment of purchase. */}
            <div className="mt-8">
              <AddToCart
                product={product}
                variant={variant}
                available={available}
                maxQuantity={maxQuantity}
                quantityBySize={quantityBySize}
              />
            </div>

            {/* Directly under the button, where the hesitation actually happens. */}
            <BuyReassurance />

            {/* A 3-up card row reads as a set of facts, not a checklist buried
                in the page — this is what earns the "museum-grade" claim its
                keep instead of just asserting it in prose. */}
            <ul className="mt-8 grid grid-cols-3 gap-3 border-t border-ink-100 pt-8">
              {HIGHLIGHTS.map((highlight) => (
                <li
                  key={highlight.text}
                  className="flex flex-col items-center gap-2 rounded-xl border border-ink-100 bg-white px-3 py-4 text-center shadow-card"
                >
                  <highlight.icon className="size-5 shrink-0 text-brand-500" />
                  <span className="text-xs font-medium text-ink-700 text-pretty">
                    {highlight.text}
                  </span>
                </li>
              ))}
            </ul>

            {product.description ? (
              <div className="mt-8 rounded-card border border-ink-100 bg-white p-5">
                <h2 className="text-sm font-semibold tracking-wide text-ink-950 uppercase">
                  Description
                </h2>
                <div
                  className="mt-3 space-y-3 text-sm/6 text-ink-600 [&_a]:text-brand-600 [&_a]:underline [&_li]:list-disc [&_ul]:pl-5"
                  dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
                />
              </div>
            ) : null}

            <div className="mt-6 rounded-card bg-white px-5">
              <Accordion items={SHIPPING_FAQ} />
            </div>
          </div>
        </div>
      </Container>

      <Suspense fallback={null}>
        <RelatedProducts handle={handle} />
      </Suspense>

      {/* Clears the sticky mobile buy bar, which would otherwise sit on top of
          the last row of related products. */}
      <div aria-hidden className="h-20 sm:hidden" />
    </>
  );
}

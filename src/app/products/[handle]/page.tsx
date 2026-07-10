import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ProductViewTracker } from "@/components/analytics/product-view";
import { AddToCart } from "@/components/product/add-to-cart";
import { Gallery } from "@/components/product/gallery";
import { ProductGridSection } from "@/components/home/product-grid-section";
import { Accordion } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { Price } from "@/components/ui/price";
import { LeafIcon, ReturnIcon, TruckIcon } from "@/components/icons";
import { discountPercent } from "@/lib/money";
import {
  defaultVariant,
  getProduct,
  getProductHandles,
  getProducts,
  getVariantQuantityAvailable,
} from "@/lib/shopify/products";

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
  const maxQuantity = variant ? await getVariantQuantityAvailable(variant.id) : null;

  return (
    <>
      <ProductViewTracker product={product} variant={variant} />

      <Container className="py-8 lg:py-12">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <Gallery images={product.images.nodes} title={product.title} />

          <div className="lg:py-4">
            {product.productType ? (
              <p className="text-xs font-semibold tracking-[0.18em] text-ink-500 uppercase">
                {product.productType}
              </p>
            ) : null}

            <h1 className="mt-3 font-display text-4xl text-ink-950 sm:text-5xl">
              {product.title}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {/* The badge carries the discount, so the price line doesn't repeat it. */}
              <Price
                price={price}
                compareAt={compareAt}
                showDiscount={false}
                className="text-xl"
              />
              {percent > 0 && available ? (
                <Badge tone="sale">{percent}% off</Badge>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-ink-500">
              Inclusive of all taxes. Shipping calculated at checkout.
            </p>

            <div className="mt-8">
              <AddToCart
                product={product}
                variant={variant}
                available={available}
                maxQuantity={maxQuantity}
              />
            </div>

            <ul className="mt-8 space-y-3 border-t border-ink-100 pt-6">
              {HIGHLIGHTS.map((highlight) => (
                <li
                  key={highlight.text}
                  className="flex items-center gap-3 text-sm text-ink-700"
                >
                  <highlight.icon className="size-5 shrink-0 text-brand-500" />
                  {highlight.text}
                </li>
              ))}
            </ul>

            {product.description ? (
              <div className="mt-8 border-t border-ink-100 pt-6">
                <h2 className="text-sm font-semibold text-ink-950">Description</h2>
                <div
                  className="mt-3 space-y-3 text-sm/6 text-ink-600 [&_a]:text-brand-600 [&_a]:underline [&_li]:list-disc [&_ul]:pl-5"
                  dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
                />
              </div>
            ) : null}

            <div className="mt-8">
              <Accordion items={SHIPPING_FAQ} />
            </div>
          </div>
        </div>
      </Container>

      <Suspense fallback={null}>
        <RelatedProducts handle={handle} />
      </Suspense>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ProductViewTracker } from "@/components/analytics/product-view";
import { AddToCart } from "@/components/product/add-to-cart";
import { DeliveryEstimate } from "@/components/product/delivery-estimate";
import { CustomCtaCard } from "@/components/product/custom-cta-card";
import { Gallery } from "@/components/product/gallery";
import { OffersBlock } from "@/components/product/offers-block";
import { PaymentMarks } from "@/components/product/payment-marks";
import { SizeGuide } from "@/components/product/size-guide";
import { CustomBanner } from "@/components/home/custom-banner";
import { ProductGridSection } from "@/components/home/product-grid-section";
import { Accordion, type AccordionItem } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { LeafIcon, ReturnIcon, TruckIcon } from "@/components/icons";
import { discountPercent, formatMoney } from "@/lib/money";
import { FLAT_SHIPPING_FEE, FREE_SHIPPING_THRESHOLD } from "@/lib/offers";
import { displayTitle, productCategory } from "@/lib/product";
import {
  CUSTOM_TAG,
  getProduct,
  getProductHandles,
  getStandardProducts,
  getVariantQuantities,
} from "@/lib/shopify/products";
import { defaultVariant, hasSizeChoice } from "@/lib/shopify/types";

function Breadcrumb({
  category,
  title,
}: {
  category: string | null;
  title: string;
}) {
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
        {category ? (
          <>
            <li aria-hidden className="text-ink-300">
              /
            </li>
            <li className="text-ink-700">{category}</li>
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

const TRUST = [
  { icon: LeafIcon, text: "300gsm matte paper" },
  { icon: TruckIcon, text: "Dispatched within 24 hours" },
  { icon: ReturnIcon, text: "7-day replacement if damaged" },
];

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

async function RelatedProducts({ handle }: { handle: string }) {
  // Excludes custom prints: they need an upload before they can be bought, so
  // offering one as a one-click "you might also like" sends the customer down
  // a different path than the shelf implies.
  const products = await getStandardProducts({ first: 5 });
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
  const isCustom = product.tags.includes(CUSTOM_TAG);

  const category = productCategory(product);
  const heading = displayTitle(product);

  // Fetched separately from the product so a store without inventory-read
  // access still renders the page — see getVariantQuantityAvailable. One
  // request for every variant, since stock differs per size.
  const rawQuantities = await getVariantQuantities(
    product.variants.nodes.map((node) => node.id),
  );

  // Shopify returns 0 for every variant when inventory isn't tracked (which is
  // the whole live catalogue right now). Treat a non-positive count as
  // "unknown", not "none" — otherwise the quantity stepper caps at one and
  // quietly breaks every buy-more-than-one bundle.
  const quantityBySize: Record<string, number | null> = {};
  for (const [id, qty] of Object.entries(rawQuantities)) {
    quantityBySize[id] = qty !== null && qty > 0 ? qty : null;
  }

  const maxQuantity = variant ? (quantityBySize[variant.id] ?? null) : null;

  const details: AccordionItem[] = [
    {
      question: "Size guide",
      content: <SizeGuide />,
    },
    {
      question: "Shipping",
      answer: `Dispatched within 24 hours of your order. Metro cities receive it in about 3–4 working days, the rest of India in 4–7. Free over ₹${FREE_SHIPPING_THRESHOLD}, otherwise a flat ₹${FLAT_SHIPPING_FEE} anywhere in India.`,
    },
    {
      question: "Returns",
      answer:
        "If it arrives damaged or blurred, send us a short video within 7 days and we'll ship a replacement free. You keep the original, there's no return shipping, and no arguing.",
    },
  ];

  // The Shopify description leads the list and opens by default — it's the copy
  // the merchandiser wrote for this specific poster — but it's a closable row
  // like the rest, so a long description never forces a scroll past it.
  if (product.descriptionHtml) {
    details.unshift({
      question: "Description",
      defaultOpen: true,
      content: (
        <div
          className="text-sm/6 text-ink-600 [&>*:first-child]:mt-0 [&_a]:text-brand-600 [&_a]:underline [&_a]:underline-offset-2 [&_h3]:mt-6 [&_h3]:font-display [&_h3]:text-lg [&_h3]:text-ink-950 [&_h4]:mt-5 [&_h4]:font-medium [&_h4]:text-ink-900 [&_h5]:mt-5 [&_h5]:font-medium [&_h5]:text-ink-900 [&_img]:my-4 [&_img]:max-h-104 [&_img]:w-auto [&_img]:max-w-full [&_img]:rounded-card [&_li]:mt-1 [&_p]:mt-3 [&_strong]:font-semibold [&_strong]:text-ink-900 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5"
          dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
        />
      ),
    });
  }

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
        <Breadcrumb category={category} title={heading} />

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 xl:gap-20">
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

          <div className="lg:py-2">
            {category ? (
              <p className="text-xs font-semibold tracking-[0.18em] text-brand-600 uppercase">
                {category}
              </p>
            ) : null}

            <h1 className="mt-2 font-display text-4xl text-ink-950 sm:text-5xl">
              {heading}
            </h1>

            {/* Price lives inside AddToCart because it must track the selected
                size. Rendering it here as a server value would leave it
                showing the cheapest variant's price after the customer picks
                a bigger one — the exact mismatch that erodes trust at the
                moment of purchase. */}
            {/* A custom product cannot be added to the cart from here: there
                is no artwork on the order yet. Everything else about the page
                — gallery, price, specs, shipping — is identical to any other
                product, because the product is identical. Only the step that
                collects the file differs. */}
            <div className="mt-6">
              {isCustom ? (
                <>
                  <p className="text-3xl font-semibold text-ink-950">
                    From {formatMoney(product.priceRange.minVariantPrice)}
                  </p>
                  <ButtonLink
                    href={`/custom/${product.handle}`}
                    size="lg"
                    className="mt-5 w-full"
                  >
                    Upload your image
                  </ButtonLink>
                  <p className="mt-3 text-sm text-ink-500">
                    Pick your size on the next step. We check the file&apos;s
                    resolution before you pay.
                  </p>
                </>
              ) : (
                <AddToCart
                  product={product}
                  variant={variant}
                  available={available}
                  maxQuantity={maxQuantity}
                  quantityBySize={quantityBySize}
                />
              )}
            </div>

            {!isCustom ? (
              <div className="mt-6 space-y-3">
                <OffersBlock product={product} />
                <CustomCtaCard />
              </div>
            ) : null}

            {/* A slim row of checkable facts, directly under the button where
                the hesitation happens — concrete specs, not adjectives. */}
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-ink-100 pt-6">
              {TRUST.map((item) => (
                <li
                  key={item.text}
                  className="flex items-center gap-2 text-xs font-medium text-ink-700"
                >
                  <item.icon className="size-4 shrink-0 text-brand-500" />
                  {item.text}
                </li>
              ))}
            </ul>

            <div className="mt-6">
              <DeliveryEstimate />
            </div>

            <div className="mt-6">
              <PaymentMarks />
            </div>

            {/* Lives in the buy column, not spanning the full page width below
                it: a full-bleed block here left a lone paragraph pinned to the
                left edge with a metre of dead space beside it on anything
                wider than a laptop. Matching the column keeps it under the
                sticky gallery, which stays in view while it's read. */}
            <div className="mt-10 border-t border-ink-100 pt-8">
              <h2 className="font-display text-2xl text-ink-950">
                Product details
              </h2>
              <div className="mt-4">
                <Accordion items={details} />
              </div>
            </div>
          </div>
        </div>
      </Container>

      <Suspense fallback={null}>
        <RelatedProducts handle={handle} />
      </Suspense>

      {!isCustom ? <CustomBanner /> : null}

      {/* Clears the sticky mobile buy bar, which would otherwise sit on top of
          the last row of related products. */}
      <div aria-hidden className="h-20 sm:hidden" />
    </>
  );
}

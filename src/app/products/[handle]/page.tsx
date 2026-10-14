import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ProductViewTracker } from "@/components/analytics/product-view";
import { AddToCart } from "@/components/product/add-to-cart";
import { DeliveryEstimate } from "@/components/product/delivery-estimate";
import { PincodeCheck } from "@/components/product/pincode-check";
import { CustomCtaCard } from "@/components/product/custom-cta-card";
import { Gallery } from "@/components/product/gallery";
import { GiftProgress } from "@/components/product/gift-progress";
import { OffersBlock } from "@/components/product/offers-block";
import { PaymentMarks } from "@/components/product/payment-marks";
import { SizeGuide } from "@/components/product/size-guide";
import { CustomPrints } from "@/components/home/custom-prints";
import { ProductReviews } from "@/components/product/product-reviews";
import { ProductGridSection } from "@/components/home/product-grid-section";
import { Accordion, type AccordionItem } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Rating } from "@/components/ui/rating";
import {
  ArrowRightIcon,
  LeafIcon,
  ReturnIcon,
  TruckIcon,
} from "@/components/icons";
import { DAMAGE_PROOF, REPLACEMENT_WINDOW_DAYS } from "@/lib/company";
import { getProductReviews } from "@/lib/reviews";
import { absoluteUrl } from "@/lib/site";
import { discountPercent, formatMoney } from "@/lib/money";
import { FLAT_SHIPPING_FEE, FREE_SHIPPING_THRESHOLD } from "@/lib/offers";
import { displayTitle, productCategory } from "@/lib/product";
import {
  CUSTOM_TAG,
  getCustomProducts,
  getProduct,
  getProductHandles,
  getStandardProducts,
  getVariantQuantities,
} from "@/lib/shopify/products";
import { defaultVariant, hasSizeChoice, type Product } from "@/lib/shopify/types";

function Breadcrumb({
  category,
  title,
}: {
  category: string | null;
  title: string;
}) {
  return (
    <>
      {/* On mobile the whole trail was hidden, so a shopper arriving from
          search or Instagram had no route into the range this poster belongs
          to — the one link most likely to produce a second product view. */}
      <Link
        href="/products"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 transition-colors hover:text-ink-900 lg:hidden"
      >
        <ArrowRightIcon className="size-4 shrink-0 rotate-180" />
        All posters
      </Link>

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
    </>
  );
}

const TRUST = [
  { icon: LeafIcon, text: "300gsm matte paper" },
  { icon: TruckIcon, text: "Dispatched within 24 hours" },
  { icon: ReturnIcon, text: `${REPLACEMENT_WINDOW_DAYS}-day replacement if damaged` },
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
    alternates: { canonical: absoluteUrl(`/products/${handle}`) },
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

/**
 * Posters actually related to this one.
 *
 * This previously asked for the first five standard products and dropped the
 * current handle — which meant every product page on the site cross-sold the
 * identical four posters, teaching anyone who viewed two pages that the shelf
 * was worth ignoring. It is the only cross-sell slot on the highest-intent
 * page there is.
 *
 * Relevance is taken in three passes, most specific first: the product's own
 * section tag (Marvel, Anime, F1 …), then its category label, then best
 * sellers as the backstop so the shelf is never empty. Custom prints stay
 * excluded throughout — they need an upload before they can be bought, so
 * offering one as a one-click "you might also like" sends the shopper down a
 * different path than the shelf implies.
 */
async function RelatedProducts({ product }: { product: Product }) {
  const seen = new Set([product.handle]);
  const related: Product[] = [];

  const add = (candidates: Product[]) => {
    for (const candidate of candidates) {
      if (related.length >= 4) return;
      if (seen.has(candidate.handle)) continue;
      seen.add(candidate.handle);
      related.push(candidate);
    }
  };

  // Shopify's search grammar ORs terms inside a parenthesised group, so one
  // request covers every tag this product carries rather than one per tag.
  const tags = product.tags.filter((tag) => tag !== CUSTOM_TAG).slice(0, 6);
  if (tags.length > 0) {
    const query = `(${tags.map((tag) => `tag:'${tag.replace(/'/g, "")}'`).join(" OR ")})`;
    add(await getStandardProducts({ first: 8, query }));
  }

  if (related.length < 4) {
    const category = productCategory(product);
    if (category) {
      add(await getStandardProducts({ first: 8, query: `title:${category}` }));
    }
  }

  if (related.length < 4) {
    add(await getStandardProducts({ first: 8, sortKey: "BEST_SELLING" }));
  }

  if (related.length === 0) return null;

  return (
    <ProductGridSection
      title="You might also like"
      subtitle="More prints in the same vein."
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
  // request for every variant, since stock differs per size. Fetched alongside
  // the custom-print shelf shown below, which only a standard product needs.
  const [rawQuantities, customProducts, reviews] = await Promise.all([
    getVariantQuantities(product.variants.nodes.map((node) => node.id)),
    isCustom ? Promise.resolve<Product[]>([]) : getCustomProducts(4),
    getProductReviews(product.id),
  ]);

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
      answer: `If it arrives damaged or blurred, send us ${DAMAGE_PROOF} within ${REPLACEMENT_WINDOW_DAYS} days and we'll ship a replacement free. You keep the original, there's no return shipping, and no arguing.`,
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
  // the SERP, which qualifies the click before it costs anything.
  //
  // `aggregateRating` is included ONLY when Judge.me returned real reviews for
  // this product, and it reports exactly the figures rendered on the page.
  // Marking up a rating the page doesn't show, or one that doesn't exist, is
  // what earns a manual action — the guard, not the omission, was always the
  // point.
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description,
    image: product.images.nodes.map((image) => image.url),
    sku: variant?.id ?? product.id,
    brand: { "@type": "Brand", name: product.vendor || "Litwalls" },
    ...(reviews.count > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: reviews.average.toFixed(1),
            reviewCount: reviews.count,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
    // AggregateOffer once sizes are priced differently. A single Offer would
    // advertise the A5 price for a listing whose A3 costs three times as much,
    // and Google flags a mismatch between marked-up and displayed price.
    offers: hasSizeChoice(product)
      ? {
          "@type": "AggregateOffer",
          url: absoluteUrl(`/products/${product.handle}`),
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
          url: absoluteUrl(`/products/${product.handle}`),
          price: price.amount,
          priceCurrency: price.currencyCode,
          availability: available
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
        },
  };

  // Gives Google the hierarchy the visual breadcrumb shows, so a search result
  // can render "Litwalls › Marvel Posters › Iron Man" instead of a bare URL.
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
      {
        "@type": "ListItem",
        position: 2,
        name: "All posters",
        item: absoluteUrl("/products"),
      },
      ...(category
        ? [{ "@type": "ListItem", position: 3, name: category }]
        : []),
      {
        "@type": "ListItem",
        position: category ? 4 : 3,
        name: heading,
        item: absoluteUrl(`/products/${product.handle}`),
      },
    ],
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <Container className="py-8 lg:py-12">
        <Breadcrumb category={category} title={heading} />

        {/* `grid-cols-1` is not redundant. Without it the single mobile
            column is an implicit `auto` track, which grows to fit the
            gallery's thumbnail strip at full width — so the whole page was
            ~80px wider than a phone screen and scrolled sideways. An explicit
            column is `minmax(0, 1fr)` and lets the strip scroll instead. */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12 xl:gap-20">
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

            {/* Real reviews only. With none, nothing renders here at all —
                a "0 reviews" line advertises the absence. */}
            {reviews.count > 0 ? (
              <a
                href="#reviews"
                className="mt-3 inline-flex items-center gap-2 transition-opacity hover:opacity-80"
              >
                <Rating rating={reviews.average} reviewCount={reviews.count} />
                <span className="text-sm text-ink-500 underline decoration-ink-300 underline-offset-4">
                  Read reviews
                </span>
              </a>
            ) : null}

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
                {/* Renders only once there is something in the cart, so it
                    reports real progress rather than restating the offer the
                    block above already made. */}
                <GiftProgress />
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

            <div className="mt-6 space-y-3">
              <DeliveryEstimate />
              <PincodeCheck />
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

      <ProductReviews summary={reviews} />

      <Suspense fallback={null}>
        <RelatedProducts product={product} />
      </Suspense>

      {!isCustom ? <CustomPrints products={customProducts} /> : null}

      {/* Clears the sticky mobile buy bar, which would otherwise sit on top of
          the last row of related products. */}
      <div aria-hidden className="h-20 sm:hidden" />
    </>
  );
}

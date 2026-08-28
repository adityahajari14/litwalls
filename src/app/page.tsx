import { Categories } from "@/components/home/categories";
import { ClosingCta } from "@/components/home/closing-cta";
import { CustomPrints } from "@/components/home/custom-prints";
import { Faq } from "@/components/home/faq";
import { Hero } from "@/components/home/hero";
import { Offers } from "@/components/home/offers";
import { ProductGridSection } from "@/components/home/product-grid-section";
import { Reviews } from "@/components/home/reviews";
import { TrustStrip } from "@/components/home/trust-strip";
import { getReviews } from "@/lib/reviews";
import {
  getCollections,
  getCustomProducts,
  getProducts,
  getStandardProducts,
} from "@/lib/shopify/products";

/** The same ceiling /collections treats as "all". */
const HOME_COLLECTION_COUNT = 50;

/** One row of four on desktop, for every shelf on the page. */
const SHELF_SIZE = 4;

/**
 * Every shelf on this page is the same component with the same card, so the
 * page reads as one catalogue rather than a stack of differently-built
 * sections. Custom prints are ordinary Shopify products — mockups, variants,
 * prices — so they get the ordinary product grid too; only their product page
 * differs, because only their fulfilment does.
 *
 * Order: want it → the range → what makes it worth buying → objections.
 */
export default async function Home() {
  const [collections, customProducts, splitProducts, bestSellers, newArrivals, reviews] =
    await Promise.all([
      getCollections(HOME_COLLECTION_COUNT),
      getCustomProducts(SHELF_SIZE),
      // Split posters live in Shopify like anything else. Until they're
      // published the shelf simply doesn't render. Custom split posters are
      // excluded here — the customer-upload range only appears in "Design your
      // own" on this page.
      getProducts({ first: SHELF_SIZE, query: "tag:split AND -tag:custom" }),
      getStandardProducts({ first: SHELF_SIZE, sortKey: "BEST_SELLING" }),
      getStandardProducts({
        first: SHELF_SIZE,
        sortKey: "CREATED_AT",
        reverse: true,
      }),
      getReviews(),
    ]);

  return (
    <>
      <Hero reviews={reviews} />
      <TrustStrip />

      {collections.length > 0 ? <Categories collections={collections} /> : null}

      {/* Best sellers lead the shelves: highest-converting, and it doubles as
          social proof — other people bought these. */}
      {bestSellers.length > 0 ? (
        <ProductGridSection
          title="Best sellers"
          subtitle="Our most popular prints."
          href="/products"
          products={bestSellers}
          priority
        />
      ) : null}

      <CustomPrints products={customProducts} />

      {splitProducts.length > 0 ? (
        <ProductGridSection
          title="Split posters"
          subtitle="One image, split across three panels, for a larger wall display."
          href="/products"
          products={splitProducts}
          tone="paper"
        />
      ) : null}

      <Offers />

      {newArrivals.length > 0 ? (
        <ProductGridSection
          title="New arrivals"
          subtitle="Recently added to the collection."
          href="/products"
          products={newArrivals}
          tone="white"
        />
      ) : null}

      {/* Renders nothing until a real reviews app is connected — see
          getReviews. Never invents social proof. */}
      <Reviews reviews={reviews} />

      <Faq />
      <ClosingCta />
    </>
  );
}

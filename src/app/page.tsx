import { Categories } from "@/components/home/categories";
import { ClosingCta } from "@/components/home/closing-cta";
import { CustomPrints } from "@/components/home/custom-prints";
import { Faq } from "@/components/home/faq";
import { Hero } from "@/components/home/hero";
import { Offers } from "@/components/home/offers";
import { ProductGridSection } from "@/components/home/product-grid-section";
import { Reviews } from "@/components/home/reviews";
import { SplitPosters } from "@/components/home/split-posters";
import { TrustStrip } from "@/components/home/trust-strip";
import { getReviews } from "@/lib/reviews";
import { getCollections, getProducts } from "@/lib/shopify/products";

/** 50 is the same ceiling /collections treats as "all" — see COLLECTION_COUNT
 *  there. Below it, "Browse all collections" would be a lie for any store
 *  with more than 5 collections. */
const HOME_COLLECTION_COUNT = 50;

/**
 * Section order is the argument the page makes: want it → the range → trust
 * it → buy more of it → objections.
 *
 * Custom prints move up near the top because they're what nobody else in this
 * market offers — leading with them, not burying them after two product
 * shelves, is the actual differentiator. No section on this page is a spec
 * sheet or a price list — those live on the product and custom pages, where a
 * visitor has already decided to look closely. TrustStrip already covers
 * paper, shipping, replacement and checkout security in one glance — a second
 * section re-asserting the same four facts in more words would read as
 * padding, not proof.
 */
export default async function Home() {
  const [collections, bestSellers, newArrivals, reviews] = await Promise.all([
    getCollections(HOME_COLLECTION_COUNT),
    getProducts({ first: 4, sortKey: "BEST_SELLING" }),
    getProducts({ first: 4, sortKey: "CREATED_AT", reverse: true }),
    getReviews(),
  ]);

  return (
    <>
      <Hero reviews={reviews} />
      <TrustStrip />

      {collections.length > 0 ? <Categories collections={collections} /> : null}

      {/* The custom range is the part of the catalogue nobody else can copy. */}
      <CustomPrints />

      <SplitPosters />

      {/* Best sellers: it's the highest-converting shelf, and it doubles as
          social proof — other people bought these. */}
      {bestSellers.length > 0 ? (
        <ProductGridSection
          title="Best sellers"
          subtitle="The prints that leave our shelves fastest."
          href="/products"
          products={bestSellers}
          priority
        />
      ) : null}

      <Offers />

      {newArrivals.length > 0 ? (
        <ProductGridSection
          title="New arrivals"
          subtitle="Fresh off the press this month."
          href="/products"
          products={newArrivals}
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

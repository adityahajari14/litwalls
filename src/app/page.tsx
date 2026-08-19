import { Categories } from "@/components/home/categories";
import { ClosingCta } from "@/components/home/closing-cta";
import { CustomPrints } from "@/components/home/custom-prints";
import { Faq } from "@/components/home/faq";
import { Hero } from "@/components/home/hero";
import { HowWePrint } from "@/components/home/how-we-print";
import { Offers } from "@/components/home/offers";
import { Pricing } from "@/components/home/pricing";
import { ProductGridSection } from "@/components/home/product-grid-section";
import { Reviews } from "@/components/home/reviews";
import { TrustStrip } from "@/components/home/trust-strip";
import { getReviews } from "@/lib/reviews";
import { getCollections, getProducts } from "@/lib/shopify/products";

/**
 * Section order is the argument the page makes, in order:
 *
 *   want it → trust it → buy more of it → believe the quality → objections
 *
 * Offers sit high, right after the first product shelf, because the bundle
 * changes how many posters someone puts in the basket — and it can only do
 * that if they meet it before they have decided. WhyChooseUs was dropped: it
 * asserted in adjectives what HowWePrint now demonstrates in specs, and two
 * sections making the same claim weaken each other.
 */
export default async function Home() {
  const [collections, bestSellers, newArrivals, reviews] = await Promise.all([
    getCollections(5),
    getProducts({ first: 4, sortKey: "BEST_SELLING" }),
    getProducts({ first: 4, sortKey: "CREATED_AT", reverse: true }),
    getReviews(),
  ]);

  return (
    <>
      <Hero reviews={reviews} />
      <TrustStrip />

      {collections.length > 0 ? <Categories collections={collections} /> : null}

      {/* Best sellers lead: it's the highest-converting shelf, and it doubles
          as social proof — other people bought these. */}
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

      {/* The custom range is the part of the catalogue nobody else can copy,
          and two of its four formats exist here and nowhere else on the site. */}
      <CustomPrints />

      {newArrivals.length > 0 ? (
        <ProductGridSection
          title="New arrivals"
          subtitle="Fresh off the press this month."
          href="/products"
          products={newArrivals}
        />
      ) : null}

      {/* Empty in production until a real reviews app is connected — see
          getReviews. Renders nothing rather than inventing social proof. */}
      <Reviews reviews={reviews} />

      {/* Quality claims land better after peer proof than before it. */}
      <HowWePrint />
      <Pricing />
      <Faq />
      <ClosingCta />
    </>
  );
}

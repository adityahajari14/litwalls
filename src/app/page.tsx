import { Categories } from "@/components/home/categories";
import { ClosingCta } from "@/components/home/closing-cta";
import { CustomBanner } from "@/components/home/custom-banner";
import { Faq } from "@/components/home/faq";
import { Hero } from "@/components/home/hero";
import { ProductGridSection } from "@/components/home/product-grid-section";
import { Reviews } from "@/components/home/reviews";
import { TrustStrip } from "@/components/home/trust-strip";
import { WhyChooseUs } from "@/components/home/why-choose-us";
import { getReviews } from "@/lib/reviews";
import { getCollections, getProducts } from "@/lib/shopify/products";

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

      <CustomBanner />

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

      {/* Other customers first, then our own pitch: peer proof is what makes
          the self-description credible, not the other way round. */}
      <WhyChooseUs />
      <Faq />

      {/* The FAQ used to be the last thing on the page — a visitor who read to
          the bottom had no way to act on it without scrolling back up. */}
      <ClosingCta />
    </>
  );
}

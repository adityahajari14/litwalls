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
import { getCollections, getProducts } from "@/lib/shopify/products";

/**
 * Section order is the argument the page makes: want it → trust it → buy more
 * of it → objections.
 *
 * No section on this page is a spec sheet or a price list — those live on the
 * product and custom pages, where a visitor has already decided to look
 * closely. The home page's job is to look like a brand a stranger would trust
 * with a card number, which is a design problem before it is a content
 * problem: fewer, denser blocks of text; product photography carrying the
 * argument instead of bullet lists; one clear offer instead of every discount
 * code spelled out. TrustStrip already covers paper, shipping, replacement and
 * checkout security in one glance — a second section re-asserting the same
 * four facts in more words would read as padding, not proof.
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

      <Faq />
      <ClosingCta />
    </>
  );
}

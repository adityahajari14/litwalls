import { Categories } from "@/components/home/categories";
import { CustomBanner } from "@/components/home/custom-banner";
import { Faq } from "@/components/home/faq";
import { Hero } from "@/components/home/hero";
import { ProductGridSection } from "@/components/home/product-grid-section";
import { Reviews } from "@/components/home/reviews";
import { TrustStrip } from "@/components/home/trust-strip";
import { WhyChooseUs } from "@/components/home/why-choose-us";
import { getCollections, getProducts } from "@/lib/shopify/products";

export default async function Home() {
  const [collections, bestSellers, newArrivals] = await Promise.all([
    getCollections(5),
    getProducts({ first: 4, sortKey: "BEST_SELLING" }),
    getProducts({ first: 4, sortKey: "CREATED_AT", reverse: true }),
  ]);

  return (
    <>
      <Hero />
      <TrustStrip />

      {collections.length > 0 ? <Categories collections={collections} /> : null}

      {bestSellers.length > 0 ? (
        <ProductGridSection
          title="Best sellers"
          subtitle="The prints that leave our shelves fastest."
          href="/products"
          products={bestSellers}
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

      <WhyChooseUs />
      <Reviews />
      <Faq />
    </>
  );
}

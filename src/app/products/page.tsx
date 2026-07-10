import type { Metadata } from "next";

import { ProductCard } from "@/components/product-card";
import { Container } from "@/components/ui/container";
import { getProducts } from "@/lib/shopify/products";

export const metadata: Metadata = {
  title: "All posters",
  description:
    "Every Litwalls poster — movies, music, anime and more, printed on 300gsm museum-grade matte paper.",
};

export default async function ProductsPage() {
  const products = await getProducts({ first: 48 });

  return (
    <Container className="py-12 lg:py-16">
      <header className="max-w-2xl">
        <h1 className="font-display text-5xl text-ink-950 sm:text-6xl">
          All posters
        </h1>
        <p className="mt-3 text-ink-600 text-pretty">
          {products.length} print{products.length === 1 ? "" : "s"}, each on
          300gsm museum-grade matte paper.
        </p>
      </header>

      {products.length === 0 ? (
        <p className="mt-12 text-ink-600">
          No products yet. Add some in your Shopify admin and they&apos;ll appear
          here.
        </p>
      ) : (
        <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4 lg:gap-x-6">
          {products.map((product, index) => (
            <li key={product.id}>
              <ProductCard product={product} priority={index < 4} />
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CollectionViewTracker } from "@/components/analytics/collection-view";
import { ProductCard } from "@/components/product-card";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { getCollectionProducts, getCollections } from "@/lib/shopify/products";

type Params = { handle: string };

export async function generateStaticParams() {
  const collections = await getCollections(50);
  return collections.map((collection) => ({ handle: collection.handle }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { handle } = await params;
  const result = await getCollectionProducts(handle, 1);

  if (!result) return { title: "Collection not found" };

  return {
    title: result.collection.title,
    description: result.collection.description.slice(0, 160),
  };
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { handle } = await params;
  const result = await getCollectionProducts(handle, 48);

  if (!result) notFound();

  const { collection, products } = result;

  return (
    <Container className="py-12 lg:py-16">
      <CollectionViewTracker collection={collection} products={products} />

      <header className="max-w-2xl">
        <h1 className="font-display text-5xl text-ink-950 sm:text-6xl">
          {collection.title}
        </h1>
        {collection.description ? (
          <p className="mt-3 text-ink-600 text-pretty">{collection.description}</p>
        ) : null}
      </header>

      {products.length === 0 ? (
        <div className="mt-12">
          <p className="text-ink-600">Nothing in this collection yet.</p>
          <ButtonLink href="/products" variant="ghost" className="mt-4">
            Browse all posters
          </ButtonLink>
        </div>
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

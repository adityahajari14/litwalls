import { ProductCard } from "@/components/product-card";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import type { Product } from "@/lib/shopify/types";

export function ProductGridSection({
  id,
  title,
  subtitle,
  href,
  products,
  priority = false,
}: {
  id?: string;
  title: string;
  subtitle?: string;
  href?: string;
  products: Product[];
  priority?: boolean;
}) {
  return (
    <section id={id} className="py-16 lg:py-24">
      <Container>
        <SectionHeading title={title} subtitle={subtitle} href={href} />
        <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-6 lg:grid-cols-4 lg:gap-6">
          {products.map((product, index) => (
            <li key={product.id} className="h-full">
              <ProductCard product={product} priority={priority && index < 4} />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

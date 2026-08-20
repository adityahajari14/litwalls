import { ProductCard } from "@/components/product-card";
import { UploadIcon } from "@/components/icons";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import type { Product } from "@/lib/shopify/types";

/**
 * The custom-print range, rendered exactly like every other shelf on the page.
 *
 * These are ordinary Shopify products with their own mockups, variants and
 * prices — the only thing custom about them is that the artwork comes from the
 * customer. So they use the same <ProductCard> as the best-seller and new-in
 * shelves: same aspect ratio, same hover, same price treatment. The earlier
 * version drew bespoke dashed "your image here" tiles, which made the range
 * look like a form rather than something you could buy, and made this the only
 * section on the page that didn't match the others.
 *
 * Renders nothing when Shopify has no products tagged `custom`, rather than
 * advertising a range that isn't published yet.
 */
export function CustomPrints({ products }: { products: Product[] }) {
  if (products.length === 0) return null;

  return (
    <section id="custom" className="scroll-mt-24 bg-white py-16 lg:py-24">
      <Container>
        <SectionHeading
          title="Design your own"
          subtitle="Your photo or artwork, printed on the same 300gsm matte paper as everything else here."
          href="/custom"
          linkLabel="Start uploading"
        />

        <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-6 lg:grid-cols-4 lg:gap-6">
          {products.map((product) => (
            <li key={product.id} className="h-full">
              <ProductCard product={product} />
            </li>
          ))}
        </ul>

        <p className="mt-8 flex items-center justify-center gap-2 text-center text-sm text-ink-500">
          <UploadIcon className="size-4 shrink-0 text-ink-400" />
          We check your file&apos;s resolution before you pay, so nothing prints
          soft.
        </p>
      </Container>
    </section>
  );
}

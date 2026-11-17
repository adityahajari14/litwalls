import { ProductCard } from "@/components/product-card";
import { UploadIcon } from "@/components/icons";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { cn } from "@/lib/cn";
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
    <section id="custom" className="scroll-mt-24 bg-white py-10 sm:py-14 lg:py-20">
      <Container>
        <SectionHeading
          title="Design your own"
          subtitle="Upload your own photo or artwork and we'll print it on the same 300gsm matte paper as the rest of our posters."
          href="/custom"
          linkLabel="Get started"
        />

        <ul className={cn(
          "reveal-stagger mt-6 grid grid-cols-2 gap-x-3 gap-y-6 sm:mt-8 sm:gap-x-6 md:gap-6",
          products.length >= 5 ? "md:grid-cols-3 lg:grid-cols-5" : "lg:grid-cols-4",
        )}>
          {products.map((product, index) => (
            <li key={product.id} className={cn("h-full min-w-0", index >= 4 && "hidden md:block")}>
              <ProductCard product={product} imageSizes={products.length >= 5
                ? "(min-width: 2000px) 264px, (min-width: 1408px) 250px, (min-width: 1024px) 20vw, (min-width: 768px) 33vw, 50vw"
                : "(min-width: 2000px) 340px, (min-width: 1408px) 320px, (min-width: 1024px) 25vw, 50vw"} />
            </li>
          ))}
        </ul>

        <p className="mx-auto mt-6 flex max-w-xl items-start justify-center gap-2 text-center text-xs leading-relaxed text-ink-600 sm:mt-8 sm:items-center sm:text-sm">
          <UploadIcon className="size-4 shrink-0 text-ink-400" />
          We check your file&apos;s resolution before checkout, so nothing
          prints blurry.
        </p>
      </Container>
    </section>
  );
}

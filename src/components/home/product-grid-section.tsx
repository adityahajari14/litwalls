import { ProductCard } from "@/components/product-card";
import { cn } from "@/lib/cn";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import type { Product } from "@/lib/shopify/types";

export function ProductGridSection({
  id,
  title,
  subtitle,
  href,
  products,
  eager = false,
  tone = "paper",
}: {
  id?: string;
  title: string;
  subtitle?: string;
  href?: string;
  products: Product[];
  /** Load this shelf's first row immediately — the topmost shelf on a page. */
  eager?: boolean;
  /** Which of the two light grounds this shelf sits on. The page alternates
   *  them so consecutive shelves stay visually separated. */
  tone?: "paper" | "white";
}) {
  return (
    <section
      id={id}
      className={cn(
        "py-16 lg:py-24",
        tone === "white" ? "bg-white" : "bg-paper",
      )}
    >
      <Container>
        <SectionHeading
          title={title}
          subtitle={subtitle}
          href={href}
          className="reveal"
        />
        {/* 2 columns, then straight to 4 — never 3 or 5. Every shelf that
            renders this is a fixed "one row of four" (see SHELF_SIZE in
            app/page.tsx and the related-products slice on the product page),
            and 4 only divides evenly by 2 or 4. A 3-column step orphans the
            4th card alone on its own row; a 5-column step (the full
            catalogue grids use one) leaves an empty 5th slot with nothing to
            fill it — both are dead gaps, not real layout.

            The 4-up waits for `md` rather than `sm`. At 640px four cards are
            ~130px wide, but the row of size chips inside a card needs ~162px,
            so every card with sizes wrapped its chips to a second row and the
            "Add to cart" label ran edge to edge. 768px is the first width
            where a four-up card actually fits its own contents. */}
        <ul className="reveal-stagger mt-8 grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-4 md:gap-6">
          {products.map((product, index) => (
            <li key={product.id} className="h-full">
              <ProductCard product={product} eager={eager && index < 4} />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

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
  desktopColumns = 4,
  mobileProductLimit,
  compactSizeSelector = false,
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
  desktopColumns?: 4 | 5;
  /** Limit the two-column phone shelf without reducing the desktop selection. */
  mobileProductLimit?: number;
  compactSizeSelector?: boolean;
}) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-24 py-10 sm:py-14 lg:py-20",
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
        <ul className={cn(
          "reveal-stagger mt-6 grid grid-cols-2 gap-x-3 gap-y-6 sm:mt-8 sm:gap-x-6 md:gap-6",
          desktopColumns === 5 ? "md:grid-cols-3 lg:grid-cols-5" : "md:grid-cols-4",
        )}>
          {products.map((product, index) => (
            <li key={product.id} className={cn(
              "h-full min-w-0",
              mobileProductLimit !== undefined && index >= mobileProductLimit && "hidden md:block",
            )}>
              <ProductCard
                product={product}
                compactSizeSelector={compactSizeSelector}
                eager={eager && index < desktopColumns}
                imageSizes={desktopColumns === 5
                  ? "(min-width: 2000px) 264px, (min-width: 1408px) 250px, (min-width: 1024px) calc((100vw - 160px) / 5), (min-width: 768px) calc((100vw - 96px) / 3), 50vw"
                  : "(min-width: 2000px) 340px, (min-width: 1408px) 320px, (min-width: 768px) 25vw, 50vw"}
              />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

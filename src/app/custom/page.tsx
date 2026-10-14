import type { Metadata } from "next";

import { CustomBanner } from "@/components/home/custom-banner";
import { ProductCard } from "@/components/product-card";
import { Container } from "@/components/ui/container";
import { SUPPORT_EMAIL } from "@/lib/company";
import { absoluteUrl } from "@/lib/site";
import { getCustomProducts } from "@/lib/shopify/products";

export const metadata: Metadata = {
  title: "Custom prints",
  description:
    "Turn your own photos into posters, split panels, retro prints or pocket prints. Upload your artwork, pick your options, and we print it on 300gsm matte paper.",
  alternates: { canonical: absoluteUrl("/custom") },
};

export default async function CustomPage() {
  const products = await getCustomProducts();

  return (
    <>
      <Container className="py-8 lg:py-12">
        <p className="text-xs font-semibold tracking-[0.18em] text-brand-600 uppercase">
          Custom
        </p>
        <h1 className="mt-3 font-display text-4xl text-ink-950 sm:text-5xl">
          Design your own
        </h1>
        <p className="mt-3 max-w-lg text-ink-600 text-pretty">
          Upload your own photo or artwork and we&apos;ll print it on the same
          300gsm matte paper as the rest of our posters. Pick one below to get
          started.
        </p>

        {products.length === 0 ? (
          <p className="mt-10 text-ink-600">
            We&apos;re not taking custom orders at the moment. Email{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="font-medium text-brand-600 underline underline-offset-4"
            >
              {SUPPORT_EMAIL}
            </a>{" "}
            and we&apos;ll tell you the moment it&apos;s back.
          </p>
        ) : (
          <ul className="reveal-stagger mt-10 grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-4 md:gap-6">
            {products.map((product, index) => (
              <li key={product.id} className="h-full">
                <ProductCard product={product} eager={index < 4} />
              </li>
            ))}
          </ul>
        )}
      </Container>

      {/* Below the range, not above it: someone who has landed here already
          wants a custom print, so the products come first and the explainer
          catches whoever scrolled past without picking one. */}
      <CustomBanner className="pb-12 lg:pb-16" />
    </>
  );
}

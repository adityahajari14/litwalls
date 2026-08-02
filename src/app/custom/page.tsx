import type { Metadata } from "next";

import { CustomPosterForm } from "@/components/custom/custom-poster-form";
import { Container } from "@/components/ui/container";
import { CUSTOM_POSTER_HANDLE } from "@/lib/custom-poster";
import { getProduct } from "@/lib/shopify/products";
import { defaultVariant } from "@/lib/shopify/types";

export const metadata: Metadata = {
  title: "Custom posters",
  description:
    "Turn any image into a museum-grade poster. Upload your artwork, pick a size, and we print it on 300gsm matte paper.",
};

export default async function CustomPage() {
  const product = await getProduct(CUSTOM_POSTER_HANDLE);
  const variant = product ? defaultVariant(product) : null;

  // No invented price and no upload form we can't honour. If the
  // "custom-poster" product is missing or sold out in Shopify, say so plainly
  // rather than take an order we cannot fulfil.
  if (!variant?.availableForSale) {
    return (
      <Container className="flex flex-1 flex-col items-center justify-center py-24 text-center">
        <h1 className="font-display text-4xl text-ink-950">
          Custom printing is paused
        </h1>
        <p className="mt-3 max-w-md text-ink-600 text-pretty">
          We&apos;re not taking custom orders at the moment. Email{" "}
          <a
            href="mailto:hello@litwalls.in"
            className="font-medium text-brand-600 underline underline-offset-4"
          >
            hello@litwalls.in
          </a>{" "}
          and we&apos;ll tell you the moment it&apos;s back.
        </p>
      </Container>
    );
  }

  return (
    // Same padding rhythm as the regular product page (py-8 lg:py-12, not the
    // pt-12 lg:pt-16 that content pages use) so the two feel like one template.
    <Container className="py-8 lg:py-12">
      <CustomPosterForm price={variant.price} />

      {/* Clears the sticky mobile buy bar, exactly like the regular PDP. */}
      <div aria-hidden className="h-20 sm:hidden" />
    </Container>
  );
}

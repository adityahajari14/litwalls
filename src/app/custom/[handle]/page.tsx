import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CustomUploadForm } from "@/components/custom/custom-upload-form";
import { Container } from "@/components/ui/container";
import { CUSTOM_PRODUCTS, customProductConfig } from "@/lib/custom-products";
import { CUSTOM_TAG, getProduct } from "@/lib/shopify/products";
import { defaultVariant } from "@/lib/shopify/types";

type Params = { handle: string };

export async function generateStaticParams() {
  return CUSTOM_PRODUCTS.map((product) => ({ handle: product.handle }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { handle } = await params;
  const config = customProductConfig(handle);
  if (!config) return { title: "Custom prints" };

  return {
    title: config.label,
    description: `${config.tagline} Upload your artwork, pick your options, and we print it on 300gsm matte paper.`,
  };
}

export default async function CustomProductPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { handle } = await params;
  const config = customProductConfig(handle);
  if (!config) notFound();

  const product = await getProduct(handle);

  // No invented price and no upload form we can't honour. If this product is
  // missing, sold out, or not actually tagged `custom` in Shopify, say so
  // plainly rather than take an order we cannot fulfil.
  const variant = product ? defaultVariant(product) : null;
  if (!product || !product.tags.includes(CUSTOM_TAG) || !variant?.availableForSale) {
    return (
      <Container className="flex flex-1 flex-col items-center justify-center py-24 text-center">
        <h1 className="font-display text-4xl text-ink-950">
          {config.label} is paused
        </h1>
        <p className="mt-3 max-w-md text-ink-600 text-pretty">
          We&apos;re not taking these orders at the moment. Email{" "}
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
      <CustomUploadForm product={product} config={config} />

      {/* Clears the sticky mobile buy bar, exactly like the regular PDP. */}
      <div aria-hidden className="h-20 sm:hidden" />
    </Container>
  );
}

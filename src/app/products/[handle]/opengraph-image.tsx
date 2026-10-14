import { ImageResponse } from "next/og";

import { formatMoney } from "@/lib/money";
import {
  bodyStack,
  displayStack,
  loadOgFonts,
  OG,
  OG_CONTENT_TYPE,
  OG_SIZE,
  ogFontList,
} from "@/lib/og";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/offers";
import { displayTitle, productCategory } from "@/lib/product";
import { getProduct, getProductHandles } from "@/lib/shopify/products";
import { defaultVariant, hasSizeChoice } from "@/lib/shopify/types";

export const alt = "Litwalls poster";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
/**
 * Prerendered per product at build time. Without this the card is generated on
 * the first request for it — and the first request is almost always a social
 * crawler with a short timeout, so the very share that needed the image is the
 * one most likely to miss it and fall back to a bare link.
 */
export async function generateStaticParams() {
  const handles = await getProductHandles();
  return handles.map((handle) => ({ handle }));
}

/**
 * The share card for one poster — the artwork itself, its name and its price.
 *
 * This is the card that matters commercially. A poster sent to a friend on
 * WhatsApp previously arrived as a bare link; now it arrives as the poster,
 * which is the entire reason anyone would send it.
 *
 * The Shopify image is requested at a fixed width rather than full size: these
 * are generated for every product at build time, and pulling a 2000px original
 * per poster to draw it at 470px is build minutes spent on nothing.
 */
export default async function Image({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const [product, fonts] = await Promise.all([
    getProduct(handle),
    loadOgFonts(),
  ]);

  if (!product) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: OG.paper,
            fontFamily: displayStack(fonts),
            fontSize: 64,
            color: OG.ink,
          }}
        >
          Litwalls
        </div>
      ),
      { ...size, fonts: ogFontList(fonts) },
    );
  }

  const variant = defaultVariant(product);
  const price = variant?.price ?? product.priceRange.minVariantPrice;
  const category = productCategory(product);
  const title = displayTitle(product);
  const image = product.featuredImage;

  // Shopify's CDN takes a width parameter on the file URL.
  const artwork = image
    ? `${image.url}${image.url.includes("?") ? "&" : "?"}width=700`
    : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: OG.paper,
          position: "relative",
          fontFamily: bodyStack(fonts),
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 14,
            background: OG.brand,
          }}
        />

        <div
          style={{
            width: 520,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px 0 44px 60px",
          }}
        >
          <div
            style={{
              width: 380,
              height: 475,
              display: "flex",
              borderRadius: 4,
              overflow: "hidden",
              background: "#eeecea",
              border: `1px solid ${OG.rule}`,
            }}
          >
            {artwork ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={artwork}
                alt=""
                width={380}
                height={475}
                style={{ width: 380, height: 475, objectFit: "cover" }}
              />
            ) : null}
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 66px 0 46px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontSize: 20,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: OG.inkMuted,
            }}
          >
            <div
              style={{
                width: 9,
                height: 9,
                borderRadius: 5,
                background: OG.brand,
              }}
            />
            {category ?? "Litwalls"}
          </div>

          <div
            style={{
              display: "flex",
              fontFamily: displayStack(fonts),
              fontSize: title.length > 26 ? 66 : 86,
              lineHeight: 1,
              color: OG.ink,
              marginTop: 22,
            }}
          >
            {title}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 12,
              marginTop: 30,
            }}
          >
            {hasSizeChoice(product) ? (
              <div style={{ display: "flex", fontSize: 24, color: OG.inkMuted }}>
                from
              </div>
            ) : null}
            <div
              style={{
                display: "flex",
                fontFamily: displayStack(fonts),
                fontSize: 58,
                color: OG.ink,
              }}
            >
              {formatMoney(price)}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 21,
              color: OG.inkSoft,
              marginTop: 26,
            }}
          >
            300gsm matte · Free delivery over ₹{FREE_SHIPPING_THRESHOLD}
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 19,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: OG.brand,
              marginTop: 40,
            }}
          >
            litwalls.in
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: ogFontList(fonts) },
  );
}

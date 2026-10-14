import { ImageResponse } from "next/og";

import {
  bodyStack,
  displayStack,
  loadOgFonts,
  loadPosterThumbnails,
  OG,
  OG_CONTENT_TYPE,
  OG_SIZE,
  ogFontList,
} from "@/lib/og";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/offers";
import { ENTRY_PRICE } from "@/lib/pricing";

export const alt =
  "Litwalls — 300gsm matte posters, printed and shipped from India";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/**
 * The card every share of litwalls.in renders — WhatsApp, Instagram DMs,
 * Slack, X. Before this existed the site had `openGraph` metadata with no
 * image at all, so every shared link was a bare line of text.
 *
 * The three posters on the right are real artwork inlined from `assets/og`,
 * not a remote fetch: this is generated at build time and must not depend on
 * anything over the network resolving, and a card for a poster shop with no
 * poster on it is the exact failure it exists to fix.
 */
export default async function Image() {
  const [fonts, posters] = await Promise.all([
    loadOgFonts(),
    loadPosterThumbnails(),
  ]);

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
        {/* Brand rule down the top edge — the one flash of orange. */}
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
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 0 0 76px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontSize: 22,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: OG.inkMuted,
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                background: OG.brand,
              }}
            />
            Litwalls
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontFamily: displayStack(fonts),
              fontSize: 104,
              lineHeight: 0.92,
              color: OG.ink,
              marginTop: 26,
            }}
          >
            <div style={{ display: "flex" }}>Posters that</div>
            <div style={{ display: "flex" }}>make your</div>
            <div style={{ display: "flex", color: OG.brand }}>walls talk</div>
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 27,
              color: OG.inkSoft,
              marginTop: 32,
            }}
          >
            300gsm matte prints from ₹{ENTRY_PRICE}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              color: OG.inkMuted,
              marginTop: 12,
            }}
          >
            Free delivery over ₹{FREE_SHIPPING_THRESHOLD}
            {" · "}
            Printed &amp; shipped from India
          </div>
        </div>

        {/* Real artwork, staggered the way the hero hangs them. Blank
            rectangles here read as a broken image, not as posters — and a
            share preview for a poster shop that shows no poster is the exact
            failure this card exists to fix. */}
        <div
          style={{
            width: 470,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 26,
          }}
        >
          {posters.map((src, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                width: 118,
                height: 177,
                borderRadius: 3,
                overflow: "hidden",
                background: "#eeecea",
                transform: `translateY(${[-26, 18, -12][index] ?? 0}px)`,
                border: `1px solid ${OG.rule}`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt=""
                width={118}
                height={177}
                style={{ width: 118, height: 177, objectFit: "cover" }}
              />
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size, fonts: ogFontList(fonts) },
  );
}

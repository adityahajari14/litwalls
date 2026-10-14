import "server-only";

/**
 * Shared pieces for the generated Open Graph cards.
 *
 * The palette is lifted from `globals.css` rather than re-picked, so a share
 * preview looks like the site it links to.
 */
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

export const OG = {
  paper: "#fdfcfa",
  ink: "#1a1815",
  inkSoft: "#4f4c48",
  inkMuted: "#7f7a73",
  brand: "#ff6a00",
  rule: "#dfdcd8",
};

/**
 * One font family from Google, as a TTF satori can actually parse.
 *
 * Returns null rather than throwing if anything fails: `ImageResponse` falls
 * back to its bundled sans, which is a worse card but still a correct one, and
 * a share preview is never worth failing a production build over.
 */
async function googleFont(family: string): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=${family}&display=swap`,
      {
        headers: {
          // Deliberately an ancient Safari. Google's CSS API serves whatever
          // font format the requesting browser supports, and every modern UA
          // string gets woff2 — which satori cannot parse, so the card
          // silently fell back to the bundled sans. A UA from before woff2
          // existed is what gets a plain TTF back.
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8) AppleWebKit/533.20.25 (KHTML, like Gecko) Version/5.0.4 Safari/533.20.27",
        },
      },
    ).then((response) => response.text());

    const url = css.match(/src:\s*url\((https:\/\/[^)]+?\.(?:ttf|otf))\)/)?.[1];
    if (!url) return null;

    return await fetch(url).then((response) => response.arrayBuffer());
  } catch {
    return null;
  }
}

export type OgFonts = {
  display: ArrayBuffer | null;
  body: ArrayBuffer | null;
};

/**
 * Both faces the cards use.
 *
 * Two, not one, and this matters: whatever is passed to `ImageResponse` in
 * `fonts` becomes the *only* type it has. Registering Bebas alone set the
 * entire card — headline, price, delivery line — in an all-caps condensed
 * display face, which is unreadable at body size and looks nothing like the
 * site. Inter carries the body copy, exactly as it does on every page.
 */
export async function loadOgFonts(): Promise<OgFonts> {
  const [display, body] = await Promise.all([
    googleFont("Bebas+Neue"),
    googleFont("Inter:wght@400;600"),
  ]);
  return { display, body };
}

/** The `fonts` array for ImageResponse, omitting whichever fetch failed. */
export function ogFontList(fonts: OgFonts) {
  const list: {
    name: string;
    data: ArrayBuffer;
    style: "normal";
    weight: 400 | 600;
  }[] = [];

  if (fonts.body) {
    list.push({ name: "Inter", data: fonts.body, style: "normal", weight: 400 });
  }
  if (fonts.display) {
    list.push({
      name: "Bebas Neue",
      data: fonts.display,
      style: "normal",
      weight: 400,
    });
  }

  return list.length > 0 ? list : undefined;
}

/** Font stack for the headline, degrading when Bebas didn't load. */
export function displayStack(fonts: OgFonts) {
  return fonts.display ? "Bebas Neue" : "Inter, sans-serif";
}

/** Font stack for everything else. */
export function bodyStack(fonts: OgFonts) {
  return fonts.body ? "Inter" : "sans-serif";
}

/**
 * The three poster thumbnails on the brand card, as data URIs.
 *
 * Read from `assets/` (not `public/`) and inlined, because satori has no
 * network of its own and cannot resolve a site-relative path. Pre-resized to
 * roughly the box they are drawn in — see scripts and assets/og — so this
 * costs about 50KB of reads rather than the 1.3MB the full-size category
 * images would.
 */
export async function loadPosterThumbnails(): Promise<string[]> {
  const { readFile } = await import("node:fs/promises");
  const { join } = await import("node:path");

  const files = ["marvel.jpg", "anime.jpg", "music.jpg"];

  const loaded = await Promise.all(
    files.map(async (file) => {
      try {
        const data = await readFile(join(process.cwd(), "assets/og", file));
        return `data:image/jpeg;base64,${data.toString("base64")}`;
      } catch {
        return null;
      }
    }),
  );

  return loaded.filter((entry): entry is string => entry !== null);
}


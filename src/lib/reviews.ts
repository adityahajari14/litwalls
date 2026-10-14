import "server-only";

/**
 * Reviews, from Judge.me.
 *
 * The rule this file has always enforced stays exactly as it was: if there is
 * no real review data, every consumer receives an empty array and renders
 * nothing. What changed is that there is now somewhere real for the data to
 * come from — before, this returned `[]` unconditionally, so the store showed
 * a stranger no evidence that anyone had ever bought from it.
 *
 * Set these in `.env.local` (Judge.me admin → Settings → Integrations):
 *
 *   JUDGEME_SHOP_DOMAIN=litwalls.myshopify.com
 *   JUDGEME_API_TOKEN=…
 *
 * Without both, `configured` is false and nothing is fetched — so a local
 * checkout or a preview deploy degrades to "no reviews section" rather than
 * failing a page render.
 *
 * API: https://judge.me/help/en/articles/8409180-using-judge-me-api
 */

const API = "https://api.judge.me/api/v1";

/** Reviews change slowly and a stale one is harmless; a slow PDP is not. */
const REVIEWS_REVALIDATE = 60 * 30;

export type Review = {
  id: number;
  name: string;
  /** Judge.me has no location field; kept optional so the card can omit it. */
  location?: string;
  rating: number;
  title: string;
  body: string;
  product: string;
  verified: boolean;
  createdAt: string;
  /** Published customer photos — worth more than the star count for posters. */
  pictures: string[];
};

export type ReviewSummary = {
  reviews: Review[];
  /** Total across the whole store or the product, not just the page fetched. */
  count: number;
  average: number;
};

const EMPTY: ReviewSummary = { reviews: [], count: 0, average: 0 };

function credentials() {
  const shopDomain = process.env.JUDGEME_SHOP_DOMAIN;
  const apiToken = process.env.JUDGEME_API_TOKEN;
  return shopDomain && apiToken ? { shopDomain, apiToken } : null;
}

/** Whether reviews are wired up at all — lets callers skip the request. */
export function reviewsConfigured(): boolean {
  return credentials() !== null;
}

type JudgeMeReview = {
  id: number;
  title?: string | null;
  body?: string | null;
  rating?: number | null;
  verified?: string | boolean | null;
  created_at?: string | null;
  reviewer?: { name?: string | null } | null;
  product_title?: string | null;
  pictures?: { urls?: { original?: string; huge?: string; compact?: string } }[];
};

async function judgeMe<T>(
  path: string,
  params: Record<string, string | number | undefined>,
): Promise<T | null> {
  const auth = credentials();
  if (!auth) return null;

  const url = new URL(`${API}${path}`);
  url.searchParams.set("shop_domain", auth.shopDomain);
  url.searchParams.set("api_token", auth.apiToken);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  try {
    const response = await fetch(url, {
      next: { revalidate: REVIEWS_REVALIDATE, tags: ["reviews"] },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    // A reviews outage must never take a product page down with it. The page
    // renders without social proof, which is the pre-Judge.me behaviour.
    return null;
  }
}

/**
 * Judge.me marks verification with the string "buyer" (or "yes" on imports),
 * not a boolean, so this normalises rather than trusting truthiness — every
 * non-empty string is truthy, including ones that mean "not verified".
 */
function isVerified(value: JudgeMeReview["verified"]): boolean {
  if (typeof value === "boolean") return value;
  return value === "buyer" || value === "yes";
}

function normalise(review: JudgeMeReview): Review | null {
  const rating = Number(review.rating);
  const body = review.body?.trim() ?? "";

  // A review with no rating or no words has nothing to show on a card. Judge.me
  // returns both — star-only ratings are common — so they are filtered here
  // rather than rendering an empty quote.
  if (!Number.isFinite(rating) || rating <= 0 || body.length === 0) return null;

  return {
    id: review.id,
    name: review.reviewer?.name?.trim() || "Verified buyer",
    rating: Math.min(5, Math.max(1, Math.round(rating))),
    title: review.title?.trim() || "",
    body,
    product: review.product_title?.trim() || "",
    verified: isVerified(review.verified),
    createdAt: review.created_at ?? "",
    pictures:
      review.pictures
        ?.map((picture) => picture.urls?.huge ?? picture.urls?.original)
        .filter((url): url is string => Boolean(url)) ?? [],
  };
}

function summarise(reviews: Review[], count?: number): ReviewSummary {
  if (reviews.length === 0) return EMPTY;
  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return {
    reviews,
    count: count ?? reviews.length,
    average: total / reviews.length,
  };
}

/**
 * Store-wide reviews for the home page.
 *
 * Asks for a page of published reviews and keeps the ones that carry actual
 * prose. Deliberately does not filter to five stars: a wall of nothing but
 * five-star reviews is the thing shoppers have learned to distrust, and
 * Judge.me's own widget shows the real mix.
 */
export async function getReviews(limit = 6): Promise<Review[]> {
  const summary = await getReviewSummary(limit);
  return summary.reviews;
}

export async function getReviewSummary(limit = 6): Promise<ReviewSummary> {
  const data = await judgeMe<{ reviews: JudgeMeReview[] }>("/reviews", {
    per_page: Math.min(100, Math.max(limit * 3, 20)),
    page: 1,
    published: "true",
  });

  if (!data?.reviews) return EMPTY;

  const all = data.reviews
    .map(normalise)
    .filter((review): review is Review => review !== null);

  // Photo reviews first: for a poster, a customer's picture of it on their own
  // wall answers the question the copy cannot ("what does this look like in a
  // room like mine"). Then longer reviews, which read as considered.
  const ranked = [...all].sort((a, b) => {
    const photos = Number(b.pictures.length > 0) - Number(a.pictures.length > 0);
    if (photos !== 0) return photos;
    return b.body.length - a.body.length;
  });

  return summarise(ranked.slice(0, limit), all.length);
}

/** The numeric id Judge.me knows a Shopify product by, out of a Storefront GID. */
function shopifyNumericId(gid: string): string | null {
  return gid.match(/\/(\d+)(?:\?|$)/)?.[1] ?? null;
}

/**
 * Reviews for one product.
 *
 * Two requests, because Judge.me scopes review queries by its own internal
 * product id rather than Shopify's: resolve the Shopify id to a Judge.me id
 * first, then ask for that product's reviews. Both are cached for the same
 * half hour, so a warm product page costs neither.
 */
export async function getProductReviews(
  productGid: string,
  limit = 6,
): Promise<ReviewSummary> {
  if (!reviewsConfigured()) return EMPTY;

  const externalId = shopifyNumericId(productGid);
  if (!externalId) return EMPTY;

  const resolved = await judgeMe<{ product?: { id?: number } }>(
    "/products/-1",
    { external_id: externalId },
  );

  const productId = resolved?.product?.id;
  if (!productId) return EMPTY;

  const data = await judgeMe<{ reviews: JudgeMeReview[] }>("/reviews", {
    product_id: productId,
    per_page: 100,
    page: 1,
    published: "true",
  });

  if (!data?.reviews) return EMPTY;

  const all = data.reviews
    .map(normalise)
    .filter((review): review is Review => review !== null);

  const ranked = [...all].sort((a, b) => {
    const photos = Number(b.pictures.length > 0) - Number(a.pictures.length > 0);
    if (photos !== 0) return photos;
    return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
  });

  return summarise(ranked.slice(0, limit), all.length);
}

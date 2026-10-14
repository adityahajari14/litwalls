import { formatMoney } from "@/lib/money";
import { displayTitle, productCategory } from "@/lib/product";
import { searchProducts, suggestProducts } from "@/lib/shopify/products";
import type { Product } from "@/lib/shopify/types";
import { hasSizeChoice } from "@/lib/shopify/types";

/**
 * Live results for the header search popup.
 *
 * Deliberately lean: the popup shows a thumbnail, a name, a category and a
 * price, so that is all this sends — not the full product with every variant,
 * image and description. The `/search` page still does the real, full-page
 * query; this is only the type-ahead.
 */

/** Keep the popup to a short list — anything longer belongs on the results page. */
const POPUP_LIMIT = 6;

export async function GET(request: Request) {
  const term = (new URL(request.url).searchParams.get("q") ?? "").trim();

  // One letter matches almost everything; wait for a real query.
  if (term.length < 2) {
    return Response.json({ results: [] });
  }

  // Predictive search first — it matches half-typed and slightly misspelled
  // words, which is what a results-as-you-type list is fed. The ordinary
  // search is the fallback if that endpoint errors, and for the rare term it
  // returns nothing for.
  let products: Product[] = [];
  try {
    products = await suggestProducts(term, POPUP_LIMIT);
  } catch {
    // Fall through to the ordinary search below.
  }
  if (products.length === 0) {
    products = await searchProducts(term, POPUP_LIMIT);
  }

  const results = products.map((product) => ({
    id: product.id,
    handle: product.handle,
    title: displayTitle(product),
    category: productCategory(product),
    image: product.featuredImage
      ? {
          url: product.featuredImage.url,
          alt: product.featuredImage.altText ?? product.title,
        }
      : null,
    price: formatMoney(product.priceRange.minVariantPrice),
    priceFrom: hasSizeChoice(product),
    soldOut: !product.availableForSale,
  }));

  return Response.json({ results });
}

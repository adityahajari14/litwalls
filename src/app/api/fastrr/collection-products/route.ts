import {
  getCatalogCollectionProducts,
  paginate,
} from "@/lib/checkout/fastrr-catalog";

/**
 * Shiprocket Checkout's "Fetch Products by Collection".
 * `?collection_id=334609842350&page=1&limit=100` — the id is the numeric one
 * handed out by ../collections/route.ts.
 */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("collection_id") ?? "";

  if (!/^\d+$/.test(raw)) {
    return Response.json(
      { error: "collection_id must be a numeric id" },
      { status: 400 },
    );
  }

  try {
    const products = await getCatalogCollectionProducts(Number(raw));

    if (!products) {
      return Response.json({ error: "No such collection" }, { status: 404 });
    }

    return Response.json({
      data: { total: products.length, products: paginate(products, request) },
    });
  } catch (error) {
    console.error("Fastrr collection products sync failed", error);
    return Response.json({ error: "Catalogue unavailable" }, { status: 502 });
  }
}

import { getCatalogCollections, paginate } from "@/lib/checkout/fastrr-catalog";

/**
 * Shiprocket Checkout's "Fetch Collections". `?page=1&limit=100`.
 * See ../products/route.ts for why this is public and why it never answers
 * an error with an empty list.
 */
export async function GET(request: Request) {
  try {
    const collections = await getCatalogCollections();

    return Response.json({
      data: {
        total: collections.length,
        collections: paginate(collections, request),
      },
    });
  } catch (error) {
    console.error("Fastrr collections sync failed", error);
    return Response.json({ error: "Catalogue unavailable" }, { status: 502 });
  }
}

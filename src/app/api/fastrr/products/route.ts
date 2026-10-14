import { getCatalogProducts, paginate } from "@/lib/checkout/fastrr-catalog";

/**
 * Shiprocket Checkout's "Fetch Products" — called by them, not by us, to copy
 * our catalogue into theirs. `?page=1&limit=100`.
 *
 * Public on purpose: their sync sends no credentials, and everything here is
 * already on the storefront for anyone to read.
 */
export async function GET(request: Request) {
  try {
    const products = await getCatalogProducts();

    return Response.json({
      data: { total: products.length, products: paginate(products, request) },
    });
  } catch (error) {
    // A 5xx, not an empty list: an empty 200 would read as "the catalogue is
    // now empty" and could wipe their copy of it.
    console.error("Fastrr products sync failed", error);
    return Response.json({ error: "Catalogue unavailable" }, { status: 502 });
  }
}

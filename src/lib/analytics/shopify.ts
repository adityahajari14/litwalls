"use client";

import {
  AnalyticsEventName,
  ShopifySalesChannel,
  getClientBrowserParameters,
  sendShopifyAnalytics,
} from "@shopify/hydrogen-react";
import type {
  ShopifyAddToCartPayload,
  ShopifyAnalyticsProduct,
  ShopifyPageViewPayload,
} from "@shopify/hydrogen-react";

import {
  ACCEPTED_LANGUAGE,
  HAS_USER_CONSENT,
  SHOP_DOMAIN,
  SHOP_ID,
  STOREFRONT_ID,
  isConfigured,
  logAnalyticsError,
} from "@/lib/analytics/config";
import type { Cart, Collection, Product, ProductVariant } from "@/lib/shopify/types";

type CurrencyCode = ShopifyPageViewPayload["currency"];

/**
 * Currency comes off the money object rather than an env var: Shopify already
 * tells us the code on every price, and a hardcoded default would silently
 * mislabel revenue if the store's currency ever changed.
 */
function basePayload(currency: string) {
  return {
    ...getClientBrowserParameters(),
    hasUserConsent: HAS_USER_CONSENT,
    shopId: SHOP_ID!,
    storefrontId: STOREFRONT_ID,
    currency: currency as CurrencyCode,
    acceptedLanguage: ACCEPTED_LANGUAGE as ShopifyPageViewPayload["acceptedLanguage"],
    shopifySalesChannel: ShopifySalesChannel.headless,
    analyticsAllowed: HAS_USER_CONSENT,
    marketingAllowed: HAS_USER_CONSENT,
    saleOfDataAllowed: false,
  };
}

function toAnalyticsProduct(
  product: Product,
  variant: ProductVariant | null,
  quantity = 1,
): ShopifyAnalyticsProduct {
  const price = variant?.price ?? product.priceRange.minVariantPrice;

  return {
    productGid: product.id,
    variantGid: variant?.id,
    name: product.title,
    variantName: variant?.title,
    brand: product.vendor,
    category: product.productType || undefined,
    // Shopify wants the price as a string, which is already how it arrives.
    price: price.amount,
    quantity,
  };
}

export function trackProductView(product: Product, variant: ProductVariant | null) {
  if (!isConfigured()) return;

  const price = variant?.price ?? product.priceRange.minVariantPrice;

  const payload: ShopifyPageViewPayload = {
    ...basePayload(price.currencyCode),
    canonicalUrl: window.location.href,
    pageType: "product",
    resourceId: product.id,
    totalValue: Number(price.amount),
    products: [toAnalyticsProduct(product, variant)],
  };

  sendShopifyAnalytics(
    { eventName: AnalyticsEventName.PRODUCT_VIEW, payload },
    SHOP_DOMAIN,
  ).catch(logAnalyticsError);
}

/**
 * Takes the cart returned by the add mutation so the event carries Shopify's
 * real cart id. Attribution is keyed on that id, so a placeholder would break
 * the join between this event and the resulting order.
 */
/**
 * Firing this — and trackSearchView below — separately from the generic
 * PAGE_VIEW in ShopifyAnalytics is what lets Shopify's reports break sessions
 * down by collection and search term instead of lumping every list page into
 * one undifferentiated "page" bucket.
 */
export function trackCollectionView(collection: Collection, products: Product[]) {
  if (!isConfigured()) return;

  // A list has no single price; the first product's currency stands in for
  // the whole page, same as every storefront on one currency ever will be.
  const currency = products[0]?.priceRange.minVariantPrice.currencyCode ?? "INR";

  const payload: ShopifyPageViewPayload = {
    ...basePayload(currency),
    canonicalUrl: window.location.href,
    pageType: "collection",
    resourceId: collection.id,
    collectionHandle: collection.handle,
    collectionId: collection.id,
    products: products.map((product) => toAnalyticsProduct(product, null)),
  };

  sendShopifyAnalytics(
    { eventName: AnalyticsEventName.COLLECTION_VIEW, payload },
    SHOP_DOMAIN,
  ).catch(logAnalyticsError);
}

export function trackSearchView(searchString: string, products: Product[]) {
  if (!isConfigured()) return;

  const currency = products[0]?.priceRange.minVariantPrice.currencyCode ?? "INR";

  const payload: ShopifyPageViewPayload = {
    ...basePayload(currency),
    canonicalUrl: window.location.href,
    pageType: "search",
    searchString,
    products: products.map((product) => toAnalyticsProduct(product, null)),
  };

  sendShopifyAnalytics(
    { eventName: AnalyticsEventName.SEARCH_VIEW, payload },
    SHOP_DOMAIN,
  ).catch(logAnalyticsError);
}

export function trackAddToCart(
  cart: Cart,
  product: Product,
  variant: ProductVariant | null,
  quantity: number,
) {
  if (!isConfigured()) return;

  const price = variant?.price ?? product.priceRange.minVariantPrice;

  const payload: ShopifyAddToCartPayload = {
    ...basePayload(price.currencyCode),
    cartId: cart.id,
    totalValue: Number(price.amount) * quantity,
    products: [toAnalyticsProduct(product, variant, quantity)],
  };

  sendShopifyAnalytics(
    { eventName: AnalyticsEventName.ADD_TO_CART, payload },
    SHOP_DOMAIN,
  ).catch(logAnalyticsError);
}

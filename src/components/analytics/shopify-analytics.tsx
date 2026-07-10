"use client";

import {
  AnalyticsEventName,
  AnalyticsPageType,
  ShopifySalesChannel,
  getClientBrowserParameters,
  sendShopifyAnalytics,
  useShopifyCookies,
} from "@shopify/hydrogen-react";
import type { ShopifyPageViewPayload } from "@shopify/hydrogen-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import {
  ACCEPTED_LANGUAGE,
  CHECKOUT_DOMAIN,
  HAS_USER_CONSENT,
  SHOP_DOMAIN,
  SHOP_ID,
  STOREFRONT_ID,
  isConfigured,
  logAnalyticsError,
} from "@/lib/analytics/config";

/** Storefront currency. Page views carry no price, so this is just a label. */
const CURRENCY = "INR";

function pageTypeFor(pathname: string): string {
  if (pathname === "/") return AnalyticsPageType.home;
  if (pathname === "/products") return AnalyticsPageType.collection;
  if (pathname.startsWith("/products/")) return AnalyticsPageType.product;
  if (pathname.startsWith("/collections/")) return AnalyticsPageType.collection;
  if (pathname === "/account") return AnalyticsPageType.customersAccount;
  if (pathname.startsWith("/account/login")) return AnalyticsPageType.customersLogin;
  if (pathname.startsWith("/account")) return AnalyticsPageType.customersAccount;
  return AnalyticsPageType.page;
}

/**
 * Emits PAGE_VIEW on every client-side navigation, and keeps the
 * _shopify_y / _shopify_s cookies alive so the session survives the hop to
 * checkout. Renders nothing.
 *
 * The product page also fires a PRODUCT_VIEW; both are expected on a PDP and
 * populate different Shopify reports.
 */
export function ShopifyAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTracked = useRef<string | null>(null);

  useShopifyCookies({
    hasUserConsent: HAS_USER_CONSENT,
    checkoutDomain: CHECKOUT_DOMAIN,
  });

  const search = searchParams.toString();

  useEffect(() => {
    if (!isConfigured() || !pathname) return;

    // A repeat of the same URL is a re-render, not a navigation. Without this
    // guard router.refresh() after add-to-cart would double-count the view.
    const url = search ? `${pathname}?${search}` : pathname;
    if (lastTracked.current === url) return;
    lastTracked.current = url;

    const payload: ShopifyPageViewPayload = {
      ...getClientBrowserParameters(),
      hasUserConsent: HAS_USER_CONSENT,
      shopId: SHOP_ID!,
      storefrontId: STOREFRONT_ID,
      currency: CURRENCY as ShopifyPageViewPayload["currency"],
      acceptedLanguage: ACCEPTED_LANGUAGE as ShopifyPageViewPayload["acceptedLanguage"],
      shopifySalesChannel: ShopifySalesChannel.headless,
      analyticsAllowed: HAS_USER_CONSENT,
      marketingAllowed: HAS_USER_CONSENT,
      saleOfDataAllowed: false,
      canonicalUrl: window.location.href,
      pageType: pageTypeFor(pathname),
    };

    sendShopifyAnalytics(
      { eventName: AnalyticsEventName.PAGE_VIEW, payload },
      SHOP_DOMAIN,
    ).catch(logAnalyticsError);
  }, [pathname, search]);

  return null;
}

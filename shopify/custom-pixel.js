/* =============================================================================
 * Litwalls — Shopify checkout custom pixel
 *
 * WHERE THIS GOES
 *   Shopify admin → Settings → Customer events → Add custom pixel →
 *   name it "Litwalls GA4 + Meta", paste this whole file, click Save,
 *   then Connect. Permissions: leave analytics + marketing on.
 *
 * WHAT IT IS FOR
 *   The storefront (litwalls.in) already tracks browsing, search, add-to-cart
 *   and begin-checkout through its own Shopify / Meta / GA4 code. It CANNOT
 *   see anything that happens on Shopify's hosted checkout (orders.litwalls.in)
 *   because that is a different site this app never renders. This pixel fills
 *   exactly that gap — add_payment_info and, above all, purchase — and nothing
 *   else, so no event is counted twice.
 *
 *   Shopify's own analytics needs none of this; it records checkout natively.
 *
 * BETTER, IF YOU WANT IT
 *   For Meta specifically, installing the "Facebook & Instagram" sales channel
 *   sends Purchase through the Conversions API (server-side, with proper
 *   identity matching and de-duplication against the `eventID` set below).
 *   Keep this pixel for GA4 either way; drop the fbq blocks here if you add
 *   the channel and see doubled Meta purchases.
 *
 * EDIT THESE TWO LINES if the IDs ever change:
 * ========================================================================== */
const GA_MEASUREMENT_ID = "G-KV54TYPMW3";
const META_PIXEL_ID = "895055503039080";

const GA_LINKER_KEY = "litwalls:ga-linker";

/* --- load gtag.js inside the pixel sandbox ---------------------------------- */
(function loadGtag() {
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_MEASUREMENT_ID;
  document.head.appendChild(s);
})();
window.dataLayer = window.dataLayer || [];
function gtag() {
  window.dataLayer.push(arguments);
}
gtag("js", new Date());

/* --- load the Meta pixel inside the sandbox ------------------------------- */
/* eslint-disable */
!(function (f, b, e, v, n, t, s) {
  if (f.fbq) return;
  n = f.fbq = function () {
    n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
  };
  if (!f._fbq) f._fbq = n;
  n.push = n;
  n.loaded = !0;
  n.version = "2.0";
  n.queue = [];
  t = b.createElement(e);
  t.async = !0;
  t.src = v;
  s = b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t, s);
})(
  window,
  document,
  "script",
  "https://connect.facebook.net/en_US/fbevents.js",
);
/* eslint-enable */

/* --- recover the GA client/session id the storefront put on the URL -------- *
 * lib/analytics/ga-linker.ts appends ?ga_cid=…&ga_sid=… to the checkout link
 * so GA4 can stitch this purchase to the session that earned it. Read it from
 * the first checkout URL, then stash it so it survives the thank-you-page hop. */
let gaClientId = null;
let gaSessionId = null;

function readLinker(location) {
  try {
    const p = new URLSearchParams((location && location.search) || "");
    const cid = p.get("ga_cid");
    if (cid) {
      gaClientId = cid;
      gaSessionId = p.get("ga_sid") || gaSessionId;
    }
  } catch {
    /* malformed URL — just fall through to the stored copy */
  }
}

readLinker(
  init && init.context && init.context.document && init.context.document.location,
);

if (gaClientId) {
  browser.localStorage.setItem(
    GA_LINKER_KEY,
    JSON.stringify({ cid: gaClientId, sid: gaSessionId }),
  );
} else {
  browser.localStorage.getItem(GA_LINKER_KEY).then(function (raw) {
    if (!raw) return;
    try {
      const v = JSON.parse(raw);
      gaClientId = gaClientId || v.cid;
      gaSessionId = gaSessionId || v.sid;
      configureGa();
    } catch {
      /* ignore a malformed stored value */
    }
  });
}

function configureGa() {
  const cfg = { send_page_view: false, transport_type: "beacon" };
  if (gaClientId) cfg.client_id = gaClientId;
  if (gaSessionId) cfg.session_id = gaSessionId;
  gtag("config", GA_MEASUREMENT_ID, cfg);
}
configureGa();
fbq("init", META_PIXEL_ID);

/* --- shared shaping helpers --------------------------------------------- */
function amount(money) {
  return money && money.amount != null ? Number(money.amount) : undefined;
}

function gaItems(lineItems) {
  return (lineItems || []).map(function (li) {
    const variant = li.variant || {};
    const product = variant.product || {};
    return {
      item_id: variant.id ? String(variant.id).split("/").pop() : undefined,
      item_name: product.title || li.title,
      item_brand: product.vendor || undefined,
      item_variant: variant.title || undefined,
      price: amount(variant.price),
      quantity: li.quantity,
    };
  });
}

function metaContentIds(lineItems) {
  return (lineItems || [])
    .map(function (li) {
      return li.variant && li.variant.id;
    })
    .filter(Boolean);
}

function metaContents(lineItems) {
  return (lineItems || []).map(function (li) {
    return { id: li.variant && li.variant.id, quantity: li.quantity };
  });
}

function itemCount(lineItems) {
  return (lineItems || []).reduce(function (n, li) {
    return n + (li.quantity || 0);
  }, 0);
}

/* --- add_payment_info / AddPaymentInfo ---------------------------------- */
analytics.subscribe("payment_info_submitted", function (event) {
  const c = event.data && event.data.checkout;
  if (!c) return;

  gtag("event", "add_payment_info", {
    currency: c.currencyCode,
    value: amount(c.totalPrice),
    items: gaItems(c.lineItems),
  });

  fbq("track", "AddPaymentInfo", {
    currency: c.currencyCode,
    value: amount(c.totalPrice),
    content_type: "product",
    content_ids: metaContentIds(c.lineItems),
    contents: metaContents(c.lineItems),
  });
});

/* --- purchase / Purchase — the event that only exists here ------------- */
analytics.subscribe("checkout_completed", function (event) {
  const c = event.data && event.data.checkout;
  if (!c) return;

  const order = c.order || {};
  const transactionId = String(order.id || c.token || "");
  // Line up with the Conversions API if the Facebook channel is ever added,
  // and let GA4 de-dupe a reloaded thank-you page.
  const eventId = "purchase." + (transactionId || String(Date.now()));

  gtag("event", "purchase", {
    transaction_id: transactionId,
    currency: c.currencyCode,
    value: amount(c.totalPrice),
    tax: amount(c.totalTax),
    shipping: c.shippingLine ? amount(c.shippingLine.price) : undefined,
    coupon: (c.discountApplications || [])
      .map(function (d) {
        return d.title;
      })
      .filter(Boolean)
      .join(","),
    items: gaItems(c.lineItems),
  });

  fbq(
    "track",
    "Purchase",
    {
      currency: c.currencyCode,
      value: amount(c.totalPrice),
      content_type: "product",
      content_ids: metaContentIds(c.lineItems),
      contents: metaContents(c.lineItems),
      num_items: itemCount(c.lineItems),
    },
    { eventID: eventId },
  );

  browser.localStorage.removeItem(GA_LINKER_KEY);
});

/* --- checkout_started ---------------------------------------------------- *
 * Deliberately NOT wired. The storefront already fires begin_checkout /
 * InitiateCheckout the instant the customer clicks "Checkout". Subscribing
 * here too would double-count that funnel step. Enable it ONLY if you remove
 * the storefront's begin_checkout calls:
 *
 * analytics.subscribe("checkout_started", function (event) { ... });
 */

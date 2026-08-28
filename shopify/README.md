# Shopify-side analytics

This app is a **headless** storefront: `litwalls.in` is served by Next.js and
`orders.litwalls.in` is Shopify's hosted checkout. The Next app tracks
everything up to and including the "Checkout" click (see the main README,
_Meta Pixel & Google Analytics_). It cannot see anything on the checkout
itself. That is what the file here is for.

## `custom-pixel.js`

Fires **`add_payment_info`** and **`purchase`** (GA4) and
**`AddPaymentInfo`** / **`Purchase`** (Meta) from inside Shopify's checkout —
and nothing above that step, so no event the storefront already sends gets
counted twice.

Shopify's own analytics needs no pixel; it records checkout natively.

### Install

1. Shopify admin → **Settings → Customer events** → **Add custom pixel**.
2. Name it `Litwalls GA4 + Meta`.
3. Paste the entire contents of `custom-pixel.js`.
4. **Permissions**: leave *Analytics* and *Marketing* enabled.
5. **Save**, then **Connect**.

The two IDs are constants at the top of the file
(`GA_MEASUREMENT_ID`, `META_PIXEL_ID`) — the pixel sandbox gets no environment
variables, so edit them there if they ever change. They must match
`NEXT_PUBLIC_GA_MEASUREMENT_ID` and `NEXT_PUBLIC_META_PIXEL_ID` in the app's
`.env.local`.

### How GA4 attribution survives the domain hop

`gtag.js` scopes its client-id cookie to one host, so a fresh load in checkout
would look like a brand-new user and the purchase would not join the session
that drove it. The app works around this: `src/lib/analytics/ga-linker.ts`
puts `?ga_cid=…&ga_sid=…` on the checkout URL, and this pixel reads those back
and passes them to `gtag('config', …)` as `client_id` / `session_id`. Nothing
to configure — just don't strip query params off the checkout URL.

Also list both domains under GA4 → Admin → Data streams → your web stream →
**Configure tag settings → Configure your domains**: `litwalls.in` and
`orders.litwalls.in`.

### Verify

1. Settings → Customer events → your pixel → **it should say "Connected"**.
2. Place a real (or Bogus Gateway) test order.
3. **GA4** → Admin → DebugView, or Reports → Realtime: a `purchase` with the
   right `value`, `transaction_id`, and line items. Reports → Monetisation
   lags a few hours.
4. **Meta** → Events Manager → your pixel → **Test events** (or Overview): a
   `Purchase` with matching `value` and `currency`.
5. In GA4, confirm the purchase shares the **session** of the browsing that
   preceded it (Realtime → click into the user) — that proves `ga-linker`
   round-tripped. If purchases show as `(direct)` / new sessions, the checkout
   URL is losing its query string somewhere.

### Meta: prefer the sales channel for Purchase

Installing the **Facebook & Instagram** sales channel sends `Purchase` through
the Conversions API — server-side, with identity matching and de-duplication
against the `eventID` this pixel already sets (`purchase.<transaction_id>`).
If you add the channel, delete the two `fbq(...)` blocks from
`custom-pixel.js` so Meta stops counting each purchase twice. Keep the pixel
for GA4.

### `checkout_started`

Intentionally not wired — the storefront already fires `begin_checkout` /
`InitiateCheckout` on the "Checkout" click. There is a commented stub at the
bottom of `custom-pixel.js` if you ever move that step server-side instead.

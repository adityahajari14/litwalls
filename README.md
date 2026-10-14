# Litwalls

A headless storefront for Litwalls — posters, printed in India.

Next.js 16 (App Router) + Tailwind CSS v4 on the front, Shopify's **Headless**
sales channel on the back — Storefront API for products/cart, Customer
Account API for login. Checkout and account pages both hand off to
Shopify-hosted flows.

## Getting started

### 1. Install the Headless sales channel

In your Shopify admin: **Sales channels → add the "Headless" channel** (from
the Shopify App Store), then create a storefront inside it. This replaces the
older path of a bare custom-app Storefront token — Headless is required to
also get New Customer Accounts working.

Also confirm **Settings → Customer accounts** is set to **New customer
accounts** (not Classic).

### 2. Get the Storefront API token

Inside your Headless channel's storefront settings, copy the **Storefront API
access token**. This is public-scope by design — safe to send in a request
header, but there's no reason to ship it to the client, so it's only ever
read on the server.

### 3. Get the Customer Account API credentials

Same storefront, **Customer Account API settings**:

- **Credentials** section → copy the **Client ID** and **Client Secret**.
- **Application endpoints** section → copy the **Shop ID** shown there (this
  is what the OIDC discovery document is served from — it is *not* the same
  string as `SHOPIFY_STORE_DOMAIN`).
- Add a **callback URL**: `https://litwalls.in/account/callback` (must be
  HTTPS and publicly reachable — this will not work against `localhost`; you
  need either a deployed URL or a tunnel registered here to test the actual
  login redirect).

### 4. Configure the environment

Create `.env.local` in the project root (it is gitignored):

```bash
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_STOREFRONT_ACCESS_TOKEN=your_storefront_token

SHOPIFY_CUSTOMER_ACCOUNT_API_SHOP_ID=your_shop_id
SHOPIFY_CUSTOMER_ACCOUNT_API_CLIENT_ID=your_client_id
SHOPIFY_CUSTOMER_ACCOUNT_API_CLIENT_SECRET=your_client_secret
SHOPIFY_CUSTOMER_ACCOUNT_API_REDIRECT_URI=https://litwalls.in/account/callback

# Analytics — see "Shopify analytics" below. All three of these are public
# identifiers (they appear in any storefront's page source). Until
# NEXT_PUBLIC_SHOPIFY_SHOP_ID is set, every analytics event silently no-ops.
NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
NEXT_PUBLIC_SHOPIFY_SHOP_ID=your_numeric_shop_id
NEXT_PUBLIC_SHOPIFY_STOREFRONT_ID=your_storefront_id
NEXT_PUBLIC_SHOPIFY_CHECKOUT_DOMAIN=orders.litwalls.in
NEXT_PUBLIC_SHOPIFY_ANALYTICS_HAS_USER_CONSENT=true

# Third-party analytics — see "Meta Pixel & Google Analytics" below. All are
# public identifiers that ship in page source. Each integration no-ops when its
# var is unset, so leaving any of these blank just turns that tracker off.
NEXT_PUBLIC_META_PIXEL_ID=your_meta_pixel_id        # Meta Events Manager → Data sources
META_DOMAIN_VERIFICATION=your_meta_domain_token     # Meta Business → Brand safety → Domains
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX          # GA4 Admin → Data streams → web stream

# Shiprocket Checkout (Fastrr) — see "Fastrr checkout" below. Leave
# NEXT_PUBLIC_FASTRR_SELLER_DOMAIN blank and every button uses Shopify checkout.
NEXT_PUBLIC_FASTRR_SELLER_DOMAIN=litwalls.in        # the domain Shiprocket onboarded
FASTRR_API_KEY=your_fastrr_api_key                  # SECRET — server only
FASTRR_SECRET_KEY=your_fastrr_secret_key            # SECRET — server only
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_...                # SECRET — creates the Shopify order
SHOPIFY_WEBHOOK_SECRET=your_webhook_signing_secret  # optional: live catalogue pushes
CRON_SECRET=any_long_random_string                  # optional: the reconcile job
```

### 5. Run it

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. The catalogue and cart work locally; signing in
via `/account/login` needs the real callback URL above to complete (see step 3).

## How it fits together

| Path | What it does |
| --- | --- |
| `src/lib/shopify/client.ts` | Thin Storefront GraphQL client. Shopify answers `200 OK` on GraphQL errors, so the body is checked, not just the status. |
| `src/lib/shopify/queries.ts` | Every Storefront GraphQL document. Fragments are composed per-document so none is ever defined twice. |
| `src/lib/shopify/products.ts` | Catalogue reads, cached for 10 minutes and tagged for revalidation. |
| `src/lib/shopify/cart.ts` | Cart reads/mutations. The cart id lives in an `httpOnly` cookie. |
| `src/lib/shopify/actions.ts` | Server Actions the UI calls: add, update quantity, remove. |
| `src/lib/customer-account/discovery.ts` | Discovers the Customer Account API's OAuth endpoints from `/.well-known/openid-configuration` rather than hardcoding them. |
| `src/lib/customer-account/oauth.ts` | Authorization URL, code-for-token exchange, refresh, logout URL. Confidential client (HTTP Basic with a client secret) — no PKCE, since this is a real backend, not a public/SPA client. |
| `src/lib/customer-account/session.ts` | Access/refresh tokens live in an `httpOnly` cookie. `getValidAccessToken()` transparently refreshes an expired token. |
| `src/app/account/login/route.ts` | Redirects to Shopify's hosted login, stashing `state`/`nonce` in short-lived cookies for CSRF/replay protection. |
| `src/app/account/callback/route.ts` | Verifies `state`, exchanges the code, verifies the `nonce` inside the returned `id_token`, creates the session. |
| `src/app/account/logout/route.ts` | Clears the session and redirects through Shopify's `end_session_endpoint`. |
| `src/lib/customer-account/customer.ts` | Fetches the signed-in customer's profile + order history. Returns `null` when signed out rather than throwing. |

### Notes for whoever works on this next

- **Products have no variants.** Each has a single default variant, which is
  what the Cart API takes as its merchandise id. The PDP therefore renders no
  size selector. If you add options in Shopify, `src/app/products/[handle]`
  needs an option picker before it will work.
- **The catalogue is statically prerendered** with a 10-minute revalidate. The
  cart and the customer session are both read on the client/at request time
  so that reading their cookies doesn't force every route to render
  dynamically.
- **A stale cart cookie is not an error.** Shopify returns `cart: null` for an
  expired or completed cart; `addItem` quietly starts a new one.
- **`fetch` is not cached by default** in this Next.js version — caching is
  opt-in per request via `revalidate`.
- **The Customer Account API's auth header is the raw access token**, not
  `Bearer <token>` — that's Shopify's documented format, not a bug.
- This was built against Shopify's documented OAuth shapes on 2026-07-09
  without a live Headless channel to test against. The token exchange, nonce
  verification, and refresh logic are implemented per spec, but the actual
  redirect round-trip has not been driven against a real store — test that
  once the env vars above are real and the site is reachable at the
  registered callback URL.

## Shopify analytics

A headless storefront gets no analytics for free. Shopify's own event tracking
normally rides in on the Online Store theme's `trekkie` script; this app
replaces the Online Store, so nothing loads it and Shopify sees no sessions,
no traffic sources and no funnel — only orders, which are recorded by checkout
on Shopify's own domain. That gap is why Admin can show revenue while showing
zero visits.

`@shopify/hydrogen-react` closes it. It works outside Hydrogen, and we use
three pieces of it:

| File | What it does |
| --- | --- |
| `src/lib/analytics/config.ts` | Reads the four `NEXT_PUBLIC_` vars. `isConfigured()` gates every event, so a missing var degrades to silence rather than a crash. |
| `src/components/analytics/shopify-analytics.tsx` | Mounted once in the root layout. `useShopifyCookies` keeps the `_shopify_y`/`_shopify_s` cookies alive; a `usePathname` effect fires `PAGE_VIEW` per navigation. |
| `src/lib/analytics/shopify.ts` | `PRODUCT_VIEW` (PDP), `COLLECTION_VIEW`, `SEARCH_VIEW`, and `ADD_TO_CART` (from `<AddToCart>` / `<ProductCard>`, after the mutation succeeds, carrying Shopify's real cart id). |

Checkout and purchase need nothing here — Shopify records them natively on
its own checkout, provided the cookie stitching below is right.

### Getting the two IDs

Both live in Shopify admin under **Sales channels → Headless → your
storefront**:

- **`NEXT_PUBLIC_SHOPIFY_SHOP_ID`** — the numeric shop ID, under *Customer
  Account API settings → Application endpoints*. This is the same value as
  `SHOPIFY_CUSTOMER_ACCOUNT_API_SHOP_ID`. Either the bare number or the full
  `gid://shopify/Shop/<id>` form works; the code normalizes it.
- **`NEXT_PUBLIC_SHOPIFY_STOREFRONT_ID`** — shown on the storefront's own
  settings page. Optional, but without it Shopify can't attribute events to
  this particular headless storefront.

### The checkout domain is load-bearing

Shopify stitches a browsing session to a checkout session by matching the
`_shopify_y` and `_shopify_s` cookies. A browser will not send cookies set on
`litwalls.in` to `*.myshopify.com` — different registrable domains — so if
checkout lives on the myshopify domain, **every conversion arrives
unattributed no matter how correct the event code is.**

Checkout must therefore be served from a subdomain of the storefront's domain
(`orders.litwalls.in`), so both share the `litwalls.in` parent that
`useShopifyCookies` scopes the cookies to. Set
`NEXT_PUBLIC_SHOPIFY_CHECKOUT_DOMAIN` to match whatever Shopify actually
redirects to — if it disagrees with the real `checkoutUrl` host, attribution
breaks silently.

### Verifying it

Events are fire-and-forget: failures are swallowed (logged only in dev), so
"no errors in the console" proves nothing. To check:

1. Load a product page with the env vars set.
2. In devtools **Network**, filter for `monorail`. You want `POST`s to
   `/.well-known/shopify/monorail/unstable/produce_batch` returning `2xx` —
   one on navigation, one more for the product view.
3. In **Application → Cookies**, confirm `_shopify_y` and `_shopify_s` exist
   and are scoped to `litwalls.in`, not the myshopify domain.
4. Shopify Admin → Analytics lags; allow a few hours before concluding
   anything from an empty dashboard.

Consent is opt-out here (`HAS_USER_CONSENT` defaults true). If you add a
cookie banner, set `NEXT_PUBLIC_SHOPIFY_ANALYTICS_HAS_USER_CONSENT=false`
until the visitor accepts, and note that `marketingAllowed` currently follows
the same flag.

### Reviews

There are none, deliberately. `<Reviews />` renders nothing until it is passed
real reviews, and product cards show no star rating. Wire it to a reviews app
(Judge.me, Loox) or a Shopify metafield rather than reintroducing placeholder
ratings.

## Meta Pixel & Google Analytics

Same problem as Shopify analytics, same shape of fix: a headless storefront
loads no marketing tags for free, so the Meta Pixel and GA4 are installed by
hand and fire the same events the Shopify tracker does. All three run side by
side from the root layout.

### The storefront half (this app)

| File | What it does |
| --- | --- |
| `src/lib/analytics/meta-config.ts` / `google-config.ts` | Read `NEXT_PUBLIC_META_PIXEL_ID` / `NEXT_PUBLIC_GA_MEASUREMENT_ID`. Each `is…Configured()` gates its events — an unset var turns that tracker off, nothing crashes. |
| `src/components/analytics/meta-pixel.tsx` / `google-analytics.tsx` | Mounted once in the layout's analytics `<Suspense>` boundary. Inject the base script, then fire a page view per client-side navigation. |
| `src/lib/analytics/meta-pixel.ts` / `google-analytics.ts` | The event helpers — one call per semantic event, fanned out from the same spots that already call the Shopify tracker. |
| `src/components/analytics/{product,collection,search}-view.tsx` | Server pages can't touch `window`, so these `useEffect`-only components fire the view events for all three trackers at once. |
| `src/lib/analytics/ga-linker.ts` | Appends `?ga_cid=…&ga_sid=…` to the checkout URL so GA4 can join the purchase (fired on Shopify's domain) to the session that earned it. See the custom pixel below. |

What fires where — every row hits all three trackers unless noted:

| Customer action | Shopify | Meta | GA4 |
| --- | --- | --- | --- |
| Any navigation | `PAGE_VIEW` | `PageView` | `page_view` |
| Product page | `PRODUCT_VIEW` | `ViewContent` | `view_item` |
| Collection page | `COLLECTION_VIEW` | `ViewCategory`¹ | `view_item_list` |
| Search results | `SEARCH_VIEW` | `Search` | `search` + `view_item_list` |
| Add to cart | `ADD_TO_CART` | `AddToCart` | `add_to_cart` |
| Clicks "Checkout" | — | `InitiateCheckout` | `begin_checkout` |
| Enters payment details | native | `AddPaymentInfo`² | `add_payment_info`² |
| Completes the order | native | `Purchase`² | `purchase`² |

¹ A custom event — Meta has no standard one for category pages. ² Fired by the
Shopify custom pixel, not this app (next section).

### The checkout half (`shopify/custom-pixel.js`)

Everything from "enters payment details" down happens on
`orders.litwalls.in`, Shopify's hosted checkout, which this app never renders.
`shopify/custom-pixel.js` covers exactly that gap and nothing above it, so no
event is double-counted.

Install it: **Shopify admin → Settings → Customer events → Add custom pixel**,
paste the whole file, Save, Connect. It reads the two IDs from constants at
the top — update them there if they ever change. `shopify/README.md` has the
full walkthrough and the verification steps.

For Meta, the sturdier alternative is the **Facebook & Instagram sales
channel**: it sends `Purchase` through the Conversions API (server-side, with
identity matching and de-duplication against the `eventID` the custom pixel
already sets). If you add the channel, delete the `fbq` blocks from the custom
pixel so Meta doesn't count each purchase twice; keep the pixel for GA4.

### Setup checklist

1. **Env vars** (`.env.local`, all public, all already listed in step 4):
   `NEXT_PUBLIC_META_PIXEL_ID`, `META_DOMAIN_VERIFICATION`,
   `NEXT_PUBLIC_GA_MEASUREMENT_ID`.
2. **Meta domain verification** — Meta Business Settings → Brand safety →
   Domains → add `litwalls.in`. The `META_DOMAIN_VERIFICATION` token is
   rendered into `<head>` as `<meta name="facebook-domain-verification">` by
   `src/app/layout.tsx`. Deploy, then click Verify.
3. **GA4 data stream** — Analytics admin → Data streams → Web → stream for
   `https://litwalls.in`. Copy its Measurement ID (`G-…`) into the env var and
   into `shopify/custom-pixel.js`. Under **Configure tag settings → Configure
   your domains**, list both `litwalls.in` and `orders.litwalls.in`.
4. **Custom pixel** — install `shopify/custom-pixel.js` (above).
5. **Checkout domain** — the `_shopify_y` cookie note from the Shopify
   analytics section applies here too: checkout on `orders.litwalls.in`, not
   the myshopify domain, or attribution breaks for all three trackers.

### Consent

The Meta Pixel and GA4 load unconditionally (no consent gate), matching the
current Shopify-analytics default. If a banner is added, gate each tracker at
its component mount — `meta-pixel.tsx` / `google-analytics.tsx` both already
call out where — rather than deep in the event helpers.

## Product sizes

Every product in the store today is a single variant (`Default Title`) at one
price, so the product page shows **no size selector** — there is nothing to
choose. The page already supports sizes: a `<fieldset>` of size cards appears
automatically once a product carries more than one variant.

To turn it on, in Shopify admin add a product option named exactly **`Size`**
(matched by `SIZE_OPTION` in `src/lib/shopify/types.ts`) with the values
**`A5`**, **`A4`**, **`A3`**, **`13″ × 19″`** — use those exact strings so the
selector can pair each one with its millimetre dimensions. Price each variant
to match `src/lib/pricing.ts` (`A5` ₹79 / `A4` ₹99 / `A3` ₹139 / `13″ × 19″`
₹149). The card grid, the "from ₹X" copy, the per-size price, and the
`AggregateOffer` JSON-LD all switch on from there.

Inventory tracking is optional. When a variant's `quantityAvailable` is `0` or
unknown (the current state of the whole catalogue), the page treats it as
"no known limit" — the quantity stepper is uncapped and no scarcity line is
shown. Turn on tracking only if you want real "Only N left" messaging, and make
sure the Storefront token has the `unauthenticated_read_product_inventory`
scope.

## Discounts

The codes and thresholds live in `src/lib/offers.ts`; what exists in admin
must match it exactly. Where it doesn't, the storefront degrades quietly — it
applies a code, Shopify reports `applicable: false`, and the cart is
unchanged. Nothing breaks, but the offer silently does nothing.

**Run `node scripts/sync-discounts.mjs` to see whether Shopify matches**, and
again with `--apply` to fix it. Run it whenever a collection is added: a
buy-X-get-Y cannot target "all products", so each bundle carries a list of
collections, and a new collection is not on it until this is re-run. That is
exactly how the bundles stopped working — they were created against Marvel,
Movies, Music and DC, and the catalogue then moved to Cars and F1.

### The one rule that shapes everything

**Shopify applies only one buy-X-get-Y discount per order.** Verified against
the live store: two BXGY discounts never both apply — not as two codes, not as
a code plus an automatic discount, and regardless of `combinesWith`. Every
bundle is a BXGY, and so is the free gift, so *the gift cannot stack with a
bundle*. The storefront handles this by withholding the gift when a bundle is
earned, and the site says so.

An order-level discount (`FIRST_ORDER_CODE`, currently `LIT100`) is a
different class and *does* stack — but it is never applied automatically. See
"Why LIT100 is suggested, not applied" below.

Bundle codes are named `BUY{pay}GET{free}FREE` rather than
`BUY{pay}FOR{total}` — the original naming (`LIT4FOR7`) reads backwards, like
paying for 7 to get 4. A discount code should say what it does on its own,
before anyone reads the fine print.

### How a buy-X-get-Y actually applies

Two behaviours, both verified on the live store, that the cart logic is built
around:

- **The free posters have to be in the cart.** Shopify never adds them. "Buy
  4, get 3 free" does nothing at four, five or six posters; it applies at
  seven, as four paid and three free. So a rung is claimable at its `total`,
  not its `pay` count — `claimableBundles` in `offers.ts` — and the cart
  nudge counts down to the full set.
- **It is all or nothing.** Seven posters with `BUY6GET12FREE` is not "one
  free"; it is inapplicable until there are eighteen. Every claimable rung is
  put on the cart and Shopify applies the best one that fits.

### What to create

| Code | Type | Setup | Status |
| --- | --- | --- | --- |
| `BUY4GET3FREE` | Buy X get Y | Buy 4 → get 3 free (100% off) | ✅ live |
| `BUY5GET5FREE` | Buy X get Y | Buy 5 → get 5 free | ✅ live |
| `BUY6GET12FREE` | Buy X get Y | Buy 6 → get 12 free | ✅ live |
| `BUY10GET26FREE` | Buy X get Y | Buy 10 → get 26 free | ✅ live |
| `SPLITBUY1GET2FREE` | Buy X get Y | Buy 1 split set → get 2 free | ✅ live |
| `SPLITBUY2GET6FREE` | Buy X get Y | Buy 2 split sets → get 6 free | ✅ live |
| `LIT100` | Amount off order | ₹100 off, minimum ₹499, once per customer | ✅ live |
| *(no code)* | Automatic, buy X get Y | Spend ₹799 → 1× gift pack free | created by `sync-discounts.mjs --apply` |

Codes marked ✅ were created via the Admin API on 2026-08-20. Their *scope* is
what `scripts/sync-discounts.mjs` maintains; the automatic gift discount is
created by the same script. Until it exists the storefront adds the gift line,
sees Shopify charging for it, and takes it straight back out — no gift, but
nobody billed for one either.

Notes that cost an hour to rediscover:

- **BXGY cannot target "all products."** Shopify rejects it. Scope both the
  "buy" and the "get" side to collections (or specific products — not a mix
  of the two). The single ladder is scoped to every poster collection plus
  `bundle-custom-posters`, an unpublished collection holding the custom
  poster, which is how custom posters earn the same bundles; the split ladder
  to the products tagged exactly `split`.
- **Tag searches ignore case.** `tag:split` also matches ordinary posters
  with a descriptive "Split" tag, and `tag:custom` matches "Custom". The
  lowercase tags are the markers; `isCustomProduct` / `isSplitProduct` in
  `src/lib/product.ts` re-check every tag search exactly.
- **Set `combinesWith`** on every discount: tick *order discounts* on the
  bundles, and *product discounts* on `LIT100`. Without this LIT100 will not
  stack with a bundle. All live codes already have this set correctly.
- **The gift must be an automatic discount, not a code** — the storefront adds
  the gift line itself and expects Shopify to zero it with no code involved.
- The split ladder needs products tagged `split`. Today that is only the
  custom split poster.

### Why LIT100 is suggested, not applied

Bundles and the gift auto-apply because each one changes something physically
in the cart — more posters land in the basket, a gift line appears — so
applying them without asking just completes what the customer's own actions
already implied. LIT100 is different: it is a discount on money the customer
was already about to spend, and having the total quietly drop without being
asked can read as the price being unstable rather than as a win.

So the cart drawer surfaces a one-tap suggestion (`DiscountSuggestion` in
`cart-drawer.tsx`) once the subtotal crosses `FIRST_ORDER_MINIMUM`, and the
customer applies it themselves. It still works if typed manually at any time.

### How the cart uses them

`syncCartDiscounts` runs after every add, quantity change and removal. It
works out which rungs the basket can claim, puts those codes on the cart, and
removes them if the basket shrinks. Codes the customer typed are never touched
— only the ones in `MANAGED_DISCOUNT_CODES` are managed.

`syncCartGift` runs after it, adding or withdrawing the gift line (marked with
a `_gift` attribute so the cart can tell its own line from the customer's).
The gift is withheld only when Shopify has actually applied a bundle, and any
gift line Shopify is charging for is removed again.

Everything displayed is Shopify's own number. `cartDiscountTotal` derives the
saving as full price minus `cost.totalAmount`, because the two discount
classes report themselves in different places: a BXGY lands on the line (and
Shopify splits the line in two to do it), while an order discount only moves
the cart total.

## Custom prints

`/custom/<handle>` is the upload page for the four customer-artwork products
(`lib/custom-products.ts`). What happens to the image:

1. **Picked and framed in the browser.** The preview is the print: the frame is
   the paper's shape at the chosen size. **Adjust** lets the customer drag,
   zoom and rotate (`components/custom/artwork-editor.tsx`). Print-quality
   warnings are judged on the part they framed, not the whole file — zooming in
   on a face can turn a sharp photo into a soft print, and the page says so.
2. **Rendered to the crop.** On "Add to cart" the framing is baked into a JPEG
   (`lib/artwork-edit.ts`), so the printer has no cropping decision to make.
   An image that already fits and was not touched is sent as it was picked. If
   a browser cannot render the crop, the original is sent with a `Crop` line
   property describing it in words.
3. **Uploaded straight to Shopify**, not through this server, then registered
   as a permanent file (`fileCreate`). This step is the one that used to be
   missing: the upload target is a temporary bucket, and its address was being
   put on the order.
4. **Added to the cart** with the file's `cdn.shopify.com` address as the
   `Artwork` line property.

Every upload therefore appears in Shopify admin under **Content → Files**, as
"Customer artwork". Download the print file from there or from the link on the
order. Files are created when a customer adds to cart, so abandoned carts leave
files behind; they can be deleted from that page.

**A custom print cannot be in a cart without artwork.** Product cards link to
the upload page instead of offering a quick add, and the server enforces it
regardless: `artlessCustomLines` (`lib/shopify/cart.ts`) removes any custom
line with no `Artwork`, on every add and every cart read. The free gift is
exempt — it is one of these products, added by the cart itself.

## Fastrr checkout

Shiprocket Checkout ("Fastrr") is an overlay that opens on top of the site in
place of Shopify's hosted checkout, adding COD, UPI and saved addresses. This
is their **custom website** integration, signed with an API key and secret.

Shopify remains the order system. Fastrr takes the payment; this app then
writes the order into Shopify.

```
"Checkout" tapped
  └─ server signs the cart ──► Fastrr access-token API ──► token
       └─ HeadlessCheckout.addToCart(token) opens the overlay
            └─ shopper pays
                 ├─► browser: /checkout/return ──► /checkout/complete
                 └─► Fastrr POSTs /api/fastrr/order-webhook
                          └─ order fetched over the signed API
                               └─ order created in Shopify (Admin API)
```

Anything that goes wrong before the overlay opens — script blocked, API down,
a cart Fastrr can't represent — falls back to Shopify's checkout, silently.
`window.__litwallsCheckout` in the console says which one a shopper got and
why; in development the cart drawer shows it too.

**Kill switch:** unset `NEXT_PUBLIC_FASTRR_SELLER_DOMAIN` and redeploy.

### What Shiprocket needs from you

Their team configures these against your account; none of it can be done from
this codebase. All four are on the production domain, so deploy first.

| What | URL |
| --- | --- |
| Fetch Products | `https://www.litwalls.in/api/fastrr/products` |
| Fetch Collections | `https://www.litwalls.in/api/fastrr/collections` |
| Fetch Products by Collection | `https://www.litwalls.in/api/fastrr/collection-products` |
| Order webhook | `https://www.litwalls.in/api/fastrr/order-webhook` |

They append `?page=1&limit=100` (and `collection_id=`) themselves.

Also set in the Fastrr dashboard, because Fastrr — not Shopify — now decides
them at checkout:

- **Shipping charges.** The site promises free over ₹349 and a flat ₹49 below
  (`lib/offers.ts`). Fastrr's shipping rule has to say the same.
- **COD charges and prepaid discounts**, if you want either. Whatever Fastrr
  charges is what the Shopify order records.
- **No coupons of its own.** Discounts are Shopify's; see below.

### Prices and discounts

Fastrr knows nothing about bundles, `LIT100` or the free gift. It doesn't need
to: every checkout is sent with the unit prices Shopify is charging and one
fixed discount equal to everything Shopify took off
(`lib/checkout/fastrr-cart.ts`). Fastrr applies exactly that amount and nothing
else, so the total in the overlay is the total in the cart drawer.

Because prices travel with each checkout, a stale catalogue sync on Fastrr's
side cannot change what anyone pays — it can only show an old name or image.

Custom prints go through Fastrr too. Their artwork link is a line property,
which Fastrr's cart cannot carry, so it never travels through Fastrr at all:
the order webhook reads the Shopify cart the checkout was signed from and puts
each line's properties back, variant by variant. If a custom print ever ends up
on an order without its artwork, the order is tagged `fastrr-missing-artwork`
(and `fastrr-review`) and says so in its note.

`NEXT_PUBLIC_FASTRR_ALLOW_CUSTOM=false` sends carts containing a custom print
to Shopify's checkout instead. Pull it if that tag ever appears.

### The Shopify order

`lib/checkout/fastrr-order.ts` builds it. Worth knowing when reading orders:

- Tagged `Fastrr`, `fastrr-<their id>`, and `COD` or `Prepaid`. The second tag
  is the duplicate guard — their webhooks repeat.
- COD orders are **payment pending**; prepaid ones are **paid**.
- The discount on the order is worked back from the amount Fastrr collected,
  so the Shopify total always equals what was charged, including any COD fee
  or prepaid discount Fastrr added.
- Tagged `fastrr-review` when something needs a person: Shopify rejected the
  customer's details (order created without them), the cart changed
  mid-checkout, or the amounts don't add up. Filter orders by that tag.
- Created through the Admin API, so Shopify's checkout pixel does not fire.
  The purchase is reported to Meta and GA4 from `/checkout/complete` instead;
  the two paths never double-count.

If Shiprocket's Shopify channel is also connected, it will import these orders
a second time. Exclude the `Fastrr` tag there, or disconnect one of the two.

### Optional: the two background jobs

**Reconcile.** Shiprocket recommends a periodic job behind the webhook. Set
`CRON_SECRET` and call, hourly:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://www.litwalls.in/api/fastrr/reconcile?hours=24"
```

It creates any successful Fastrr order that Shopify is missing and is safe to
run as often as you like.

**Live catalogue pushes.** Without this Fastrr still re-pulls the catalogue on
its own schedule. To push changes as they happen: Shopify admin → Settings →
Notifications → Webhooks → add *Product creation*, *Product update*,
*Collection creation* and *Collection update*, format JSON, URL
`https://www.litwalls.in/api/fastrr/catalog-webhook`. Copy the signing secret from
that page into `SHOPIFY_WEBHOOK_SECRET`.

### Testing it

1. `NEXT_PUBLIC_FASTRR_ENV=staging` switches the script and the API to
   Shiprocket's sandbox — it needs staging credentials from them.
2. Add seven posters (so a bundle applies), tap Checkout, and confirm the
   overlay's total equals the drawer's.
3. Complete one COD order. Check that it appears in Shopify with the right
   lines, address and total, and that `/checkout/complete` showed it.
4. Repeat with a custom poster. The Shopify order line must carry its
   `Artwork` property, and the link must open the image you framed.

## Scripts

```bash
npm run dev     # dev server
npm run build   # production build
npm run lint    # eslint
npx tsc --noEmit  # typecheck

node scripts/sync-discounts.mjs          # report Shopify discounts vs offers.ts
node scripts/sync-discounts.mjs --apply  # fix their scope / create the gift
```

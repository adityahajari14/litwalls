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
| `src/lib/analytics/shopify.ts` | `PRODUCT_VIEW` (from the PDP) and `ADD_TO_CART` (from `<AddToCart>`, after the mutation succeeds, carrying Shopify's real cart id). |

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

## Discounts

None of these exist in the store yet. Until they are created the storefront
degrades quietly — it applies a code, Shopify reports `applicable: false`, and
the cart is unchanged. Nothing breaks and nothing is falsely promised.

The codes and thresholds live in `src/lib/offers.ts`; what is created in admin
must match it exactly.

### The one rule that shapes everything

**Shopify applies only one buy-X-get-Y discount per order.** Verified against
the live store: two BXGY discounts never both apply — not as two codes, not as
a code plus an automatic discount, and regardless of `combinesWith`. Every
bundle is a BXGY, and so is the free gift, so *the gift cannot stack with a
bundle*. The storefront handles this by withholding the gift when a bundle is
earned, and the site says so.

An order-level discount (LIT100) is a different class and *does* stack.

### What to create

| Code | Type | Setup |
| --- | --- | --- |
| `LIT4FOR7` | Buy X get Y | Buy 4 → get 3 free (100% off) |
| `LIT5FOR10` | Buy X get Y | Buy 5 → get 5 free |
| `LIT6FOR18` | Buy X get Y | Buy 6 → get 12 free |
| `LIT10FOR36` | Buy X get Y | Buy 10 → get 26 free |
| `LITSPLIT1FOR3` | Buy X get Y | Buy 1 split set → get 2 free |
| `LITSPLIT2FOR8` | Buy X get Y | Buy 2 split sets → get 6 free |
| `LIT100` | Amount off order | ₹100 off, minimum ₹499, once per customer |
| *(no code)* | Automatic, buy X get Y | Spend ₹349 → 1× mini-prints pack free |

Notes that cost an hour to rediscover:

- **BXGY cannot target "all products."** Shopify rejects it. Scope both the
  "buy" and the "get" side to collections (or specific products).
- **Set `combinesWith`** on every discount: tick *order discounts* on the
  bundles, and *product discounts* on `LIT100`. Without this LIT100 will not
  stack with a bundle.
- **The gift must be an automatic discount, not a code** — the storefront adds
  the gift line itself and expects Shopify to zero it with no code involved.
  Its "get" product must be `GIFT_PRODUCT_HANDLE` from `offers.ts`
  (`mini-pocket-prints-pack-of-5`), which does not exist in the store yet.
- The split ladder needs products tagged `split`; none are published yet.

### How the cart uses them

`syncCartDiscounts` runs after every add, quantity change and removal. It
works out which rung the basket has reached, applies that code, and removes it
if the basket shrinks below it. Codes the customer typed are never touched —
only the ones in `MANAGED_DISCOUNT_CODES` are managed.

`syncCartGift` adds or withdraws the gift line, marked with a `_gift`
attribute so the cart can tell its own line from the customer's. It refuses to
leave a gift line in the cart that Shopify is charging for.

Everything displayed is Shopify's own number. `cartDiscountTotal` derives the
saving as full price minus `cost.totalAmount`, because the two discount
classes report themselves in different places: a BXGY lands on the line (and
Shopify splits the line in two to do it), while an order discount only moves
the cart total.

## Scripts

```bash
npm run dev     # dev server
npm run build   # production build
npm run lint    # eslint
npx tsc --noEmit  # typecheck
```

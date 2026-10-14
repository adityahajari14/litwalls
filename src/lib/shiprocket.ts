import "server-only";

/**
 * Shiprocket — courier serviceability and delivery estimates by PIN code.
 *
 * Indian shoppers are trained by every large marketplace to type a PIN code
 * and get a date back. The product page previously showed one national range
 * ("18–21 Sep") with no way to confirm it applied to them, which on a store
 * they have never bought from reads as an unknown rather than a promise.
 *
 * Configure in `.env.local`:
 *
 *   SHIPROCKET_EMAIL=…
 *   SHIPROCKET_PASSWORD=…
 *   SHIPROCKET_PICKUP_PINCODE=560001      # where you dispatch from
 *   SHIPROCKET_DEFAULT_WEIGHT=0.3         # kg, a rolled poster in its tube
 *
 * Every function here degrades rather than throws: with no credentials, a
 * failed login, or a Shiprocket outage, the caller gets `null` and the page
 * falls back to the static national estimate it showed before. A shipping
 * API being down must never cost a sale.
 *
 * Docs: https://apidocs.shiprocket.in
 */

const API = "https://apiv2.shiprocket.in/v1/external";

/** Shiprocket tokens last ~10 days; refreshed an hour early to avoid a race. */
const TOKEN_TTL_MS = 9 * 24 * 60 * 60 * 1000;

/** A rolled poster in a rigid tube. Overridable per store. */
const DEFAULT_WEIGHT_KG = Number(process.env.SHIPROCKET_DEFAULT_WEIGHT ?? 0.3);

export type Serviceability = {
  serviceable: boolean;
  /** Business days to delivery, when Shiprocket gives a usable figure. */
  days: number | null;
  /** Whether any available courier offers cash on delivery to this PIN. */
  cod: boolean;
  /** Courier used for the quoted estimate, for the "via X" line. */
  courier: string | null;
};

type TokenCache = { token: string; expiresAt: number };

/**
 * Module-level, so warm server instances reuse one token instead of logging in
 * per request — Shiprocket rate-limits auth far more aggressively than it does
 * serviceability, and a login on every keystroke would trip it immediately.
 */
let tokenCache: TokenCache | null = null;
let inFlight: Promise<string | null> | null = null;

function credentials() {
  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;
  const pickup = process.env.SHIPROCKET_PICKUP_PINCODE;
  return email && password && pickup ? { email, password, pickup } : null;
}

export function shiprocketConfigured(): boolean {
  return credentials() !== null;
}

async function login(): Promise<string | null> {
  const auth = credentials();
  if (!auth) return null;

  if (tokenCache && tokenCache.expiresAt > Date.now()) return tokenCache.token;

  // Collapse concurrent callers onto one login rather than firing several.
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const response = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: auth.email, password: auth.password }),
        cache: "no-store",
      });

      if (!response.ok) return null;

      const data = (await response.json()) as { token?: string };
      if (!data.token) return null;

      tokenCache = { token: data.token, expiresAt: Date.now() + TOKEN_TTL_MS };
      return data.token;
    } catch {
      return null;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

type CourierCompany = {
  courier_name?: string;
  etd?: string;
  estimated_delivery_days?: string | number;
  cod?: number | string;
};

/**
 * Shiprocket reports transit time in two shapes depending on courier:
 * `estimated_delivery_days` as a number-ish string, or `etd` as a date. Take
 * whichever is present and usable, preferring the explicit day count.
 */
function transitDays(courier: CourierCompany): number | null {
  const explicit = Number(courier.estimated_delivery_days);
  if (Number.isFinite(explicit) && explicit > 0) return Math.round(explicit);

  if (courier.etd) {
    const eta = new Date(courier.etd);
    if (!Number.isNaN(eta.getTime())) {
      const days = Math.ceil((eta.getTime() - Date.now()) / 86_400_000);
      if (days > 0) return days;
    }
  }

  return null;
}

/** A valid Indian PIN: six digits, never starting at zero. */
export function isValidPincode(pincode: string): boolean {
  return /^[1-9][0-9]{5}$/.test(pincode);
}

/**
 * Whether we can deliver to a PIN code, and how long it takes.
 *
 * Picks the fastest serviceable courier rather than the cheapest — the number
 * shown to the shopper has to be one the business is comfortable being held
 * to, and quoting the slowest option to be safe is how a good delivery promise
 * stops converting.
 */
export async function checkServiceability(
  pincode: string,
): Promise<Serviceability | null> {
  const auth = credentials();
  if (!auth || !isValidPincode(pincode)) return null;

  const token = await login();
  if (!token) return null;

  try {
    const url = new URL(`${API}/courier/serviceability/`);
    url.searchParams.set("pickup_postcode", auth.pickup);
    url.searchParams.set("delivery_postcode", pincode);
    url.searchParams.set("weight", String(DEFAULT_WEIGHT_KG));
    url.searchParams.set("cod", "0");

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      // Serviceability for a given PIN barely changes; a day of caching keeps
      // this off Shiprocket's rate limit without the answer going stale.
      next: { revalidate: 60 * 60 * 24 },
    });

    if (response.status === 401) {
      // Token rejected — drop it so the next call logs in again.
      tokenCache = null;
      return null;
    }
    if (!response.ok) return null;

    const data = (await response.json()) as {
      data?: { available_courier_companies?: CourierCompany[] };
    };

    const couriers = data.data?.available_courier_companies ?? [];
    if (couriers.length === 0) {
      return { serviceable: false, days: null, cod: false, courier: null };
    }

    const rated = couriers
      .map((courier) => ({ courier, days: transitDays(courier) }))
      .filter((entry) => entry.days !== null)
      .sort((a, b) => (a.days ?? 0) - (b.days ?? 0));

    const fastest = rated[0];

    return {
      serviceable: true,
      days: fastest?.days ?? null,
      cod: couriers.some(
        (courier) => Number(courier.cod) === 1 || courier.cod === "1",
      ),
      courier: fastest?.courier.courier_name ?? null,
    };
  } catch {
    return null;
  }
}

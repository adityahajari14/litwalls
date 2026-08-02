/**
 * Company facts asserted publicly — in policies, in the footer, at checkout.
 *
 * These are legal and contractual claims, not copy. Anything here that is
 * wrong is a promise the business is making and cannot keep, so it lives in
 * one place rather than being retyped across seven pages.
 *
 * The BLANKS below are deliberately unfilled: they cannot be inferred from the
 * codebase, and inventing them would put a fabricated legal entity on a real
 * customer-facing contract. Fill them in before launch.
 */

export const SUPPORT_EMAIL = "hello@litwalls.in";
export const SUPPORT_HOURS = "Monday to Saturday, 10am–7pm IST";

/** How quickly a human actually replies. Claimed on the FAQ and contact page. */
export const SUPPORT_RESPONSE = "within one working day";

/** Damage/misprint window. Must match what the returns policy and cart promise. */
export const REPLACEMENT_WINDOW_DAYS = 7;

/** Flat shipping below the free-shipping threshold. Must match Shopify's rates. */
export const FLAT_SHIPPING_FEE = 49;

/** Orders dispatch within this many hours. Claimed on the FAQ. */
export const DISPATCH_HOURS = 24;

export const BULK_MIN_QUANTITY = 25;

/**
 * TODO(before launch): these must be filled in from the actual business
 * registration. A privacy policy or terms page naming no legal entity, and
 * no jurisdiction, is not enforceable — and Shopify Payments and Razorpay both
 * ask for them during onboarding.
 */
export const LEGAL_ENTITY = "[Registered business name]";
export const REGISTERED_ADDRESS = "[Registered address]";
export const JURISDICTION = "[City], India";

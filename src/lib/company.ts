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

/**
 * What we ask a customer to send when a print arrives damaged.
 *
 * A video, not a photo: it shows the damage and the print in one continuous
 * take, which is what lets us approve a replacement on the spot instead of
 * going back and forth asking for another angle.
 *
 * This exists as a constant because the site previously said both. The home
 * page, the FAQ and the product page asked for a video; the returns policy,
 * the shipping page, About and Contact asked for a photo — so the one claim a
 * hesitant buyer goes looking for had two different answers, and the binding
 * policy page disagreed with the marketing. Every surface now reads from here.
 */
export const DAMAGE_PROOF = "a short video";

/** Sentence-initial form of DAMAGE_PROOF, for copy that starts with it. */
export const DAMAGE_PROOF_SENTENCE = "Send us a short video";

/**
 * Flat shipping below the free-shipping threshold. Defined in offers.ts
 * alongside the threshold it pairs with, and forwarded here so the policy
 * pages that already import it keep working.
 */
export { FLAT_SHIPPING_FEE } from "@/lib/offers";

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

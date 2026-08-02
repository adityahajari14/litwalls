import type { Metadata } from "next";

import { ButtonLink } from "@/components/ui/button";
import { ProsePage } from "@/components/ui/prose-page";
import { BULK_MIN_QUANTITY, SUPPORT_EMAIL, SUPPORT_RESPONSE } from "@/lib/company";

export const metadata: Metadata = {
  title: "Bulk & corporate orders",
  description: `Tiered pricing on orders over ${BULK_MIN_QUANTITY} posters — cafés, offices, gyms, hostels and college fests.`,
};

export default function BulkPage() {
  return (
    <ProsePage
      title="Bulk & corporate"
      intro={`Kitting out a café, an office, a gym, a hostel floor or a college fest? Orders over ${BULK_MIN_QUANTITY} posters get tiered pricing.`}
    >
      <h2>What we can do</h2>
      <ul>
        <li>
          <span>
            <strong>Our catalogue, in volume.</strong> Any mix of designs — it
            doesn&apos;t have to be {BULK_MIN_QUANTITY} of the same poster.
          </span>
        </li>
        <li>
          <span>
            <strong>Your artwork.</strong> Branded prints, event posters, team
            photos, menu boards. Same paper, same inks.
          </span>
        </li>
        <li>
          <span>
            <strong>Sizes beyond A3.</strong> Not on the site, but available for
            bulk runs. Tell us the wall and we&apos;ll tell you what fits.
          </span>
        </li>
        <li>
          <span>
            <strong>A single invoice with GST.</strong> Because your finance
            team is going to ask.
          </span>
        </li>
      </ul>

      <h2>What it costs</h2>
      <p>
        Pricing is tiered by quantity and depends on the sizes and whether
        we&apos;re printing your artwork or ours, so we quote rather than
        publish a table we&apos;d have to caveat. Volume discounts start at{" "}
        {BULK_MIN_QUANTITY} posters and get better from there.
      </p>

      <h2>How to start</h2>
      <p>
        Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with
        roughly what you need — how many, what sizes, and whether you have
        artwork or want us to pull from the catalogue. Rough numbers are fine;
        we&apos;d rather quote early and refine than wait for you to have it all
        nailed down.
      </p>
      <p>We&apos;ll come back {SUPPORT_RESPONSE} with a quote and a timeline.</p>

      <h2>Lead time</h2>
      <p>
        A bulk run takes longer than a single poster — typically a week from
        approving the quote, longer for very large orders or non-standard sizes.
        If you&apos;re working to an event date, say so in the first email and
        we&apos;ll tell you honestly whether it&apos;s possible.
      </p>

      <div className="mt-10 flex flex-wrap gap-3">
        <ButtonLink href={`mailto:${SUPPORT_EMAIL}?subject=Bulk%20order%20enquiry`}>
          Email us your requirements
        </ButtonLink>
        <ButtonLink href="/products" variant="ghost">
          Browse the catalogue
        </ButtonLink>
      </div>
    </ProsePage>
  );
}

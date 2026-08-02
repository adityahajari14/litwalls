import type { Metadata } from "next";

import { ProsePage } from "@/components/ui/prose-page";
import {
  JURISDICTION,
  LEGAL_ENTITY,
  REGISTERED_ADDRESS,
  SUPPORT_EMAIL,
} from "@/lib/company";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "What data Litwalls collects, why, who it's shared with, and how to have it deleted.",
};

export default function PrivacyPage() {
  return (
    <ProsePage
      title="Privacy policy"
      intro="What we collect, why we collect it, and how to make us delete it."
      updated="14 July 2026"
    >
      <p>
        This policy covers litwalls.in, operated by {LEGAL_ENTITY},{" "}
        {REGISTERED_ADDRESS}.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <span>
            <strong>When you order:</strong> your name, email, phone number and
            delivery address. We need these to print the thing and get it to
            you.
          </span>
        </li>
        <li>
          <span>
            <strong>When you pay:</strong> nothing. Payment is handled entirely
            by Shopify&apos;s checkout — your card details never touch our
            servers and we never see them.
          </span>
        </li>
        <li>
          <span>
            <strong>When you subscribe:</strong> your email address, so we can
            send you the discount code and the occasional new-drop email.
          </span>
        </li>
        <li>
          <span>
            <strong>When you upload custom artwork:</strong> the image itself.
            See below — this one deserves its own section.
          </span>
        </li>
        <li>
          <span>
            <strong>As you browse:</strong> standard analytics — pages viewed,
            products viewed, roughly where in the world you are. We use this to
            understand what people want, not to build a profile of you.
          </span>
        </li>
      </ul>

      <h2>Your custom artwork</h2>
      <p>
        If you upload an image on our <a href="/custom">custom poster page</a>,
        it is stored with Shopify and used for exactly one thing: printing your
        poster.
      </p>
      <p>
        We do not sell prints of your image to anyone else, publish it, use it
        in marketing, or feed it to anybody&apos;s training data. If you want it
        deleted after your order arrives, email us and we&apos;ll delete it.
      </p>

      <h2>Who we share it with</h2>
      <p>
        Only the companies that make the order happen, and only the parts they
        need:
      </p>
      <ul>
        <li>
          <span>
            <strong>Shopify</strong> — our store and checkout platform. They
            process the order and the payment.
          </span>
        </li>
        <li>
          <span>
            <strong>Our courier</strong> — gets your name, address and phone
            number, because otherwise they cannot deliver a parcel.
          </span>
        </li>
        <li>
          <span>
            <strong>Our print partner</strong> — gets the artwork and the size.
            Not your payment details.
          </span>
        </li>
      </ul>
      <p>We do not sell your data. There is no version of this where we do.</p>

      <h2>Cookies</h2>
      <p>
        We use a cookie to remember what&apos;s in your cart — without it, your
        cart empties every time you open a new page. Shopify sets its own
        cookies during checkout. Analytics cookies tell us which posters people
        look at.
      </p>

      <h2>Your rights</h2>
      <p>
        You can ask us for a copy of everything we hold on you, ask us to
        correct it, or ask us to delete it. Email{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and we&apos;ll
        do it — we&apos;re not going to make you jump through hoops.
      </p>
      <p>
        One limit: we have to keep order and tax records for as long as Indian
        law requires, so we can&apos;t delete a completed order&apos;s invoice
        even if you ask. We can delete everything else.
      </p>
      <p>
        You can unsubscribe from marketing email with the link at the bottom of
        every one of them. That&apos;s instant and doesn&apos;t affect anything
        about your orders.
      </p>

      <h2>Children</h2>
      <p>
        Litwalls isn&apos;t aimed at children under 13 and we don&apos;t
        knowingly collect their data.
      </p>

      <h2>Changes</h2>
      <p>
        If we change this policy we&apos;ll update the date at the top. If the
        change is significant, we&apos;ll email anyone on our list rather than
        quietly hoping you re-read the page.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about any of this go to{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. This policy is
        governed by the laws of {JURISDICTION}.
      </p>
    </ProsePage>
  );
}

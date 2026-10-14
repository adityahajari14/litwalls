import type { Metadata } from "next";
import Link from "next/link";

import { ProsePage } from "@/components/ui/prose-page";
import {
  JURISDICTION,
  LEGAL_ENTITY,
  REPLACEMENT_WINDOW_DAYS,
  SUPPORT_EMAIL,
} from "@/lib/company";

export const metadata: Metadata = {
  title: "Terms of service",
  description:
    "The terms you agree to when you buy from Litwalls — orders, pricing, custom artwork, and liability.",
};

export default function TermsPage() {
  return (
    <ProsePage
      title="Terms of service"
      intro="The agreement between you and us when you buy a poster. We've tried to write it in English rather than legalese."
      updated="14 July 2026"
    >
      <p>
        By ordering from litwalls.in you agree to these terms. The site is
        operated by {LEGAL_ENTITY}.
      </p>

      <h2>Orders</h2>
      <p>
        An order is an offer to buy, which we accept when we dispatch it. Until
        then we may decline it — if the price was wrong, if we can&apos;t print
        it, or if we suspect fraud. If we decline an order you&apos;ve paid for,
        you get a full refund. Obviously.
      </p>

      <h2>Pricing</h2>
      <p>
        Prices are in Indian rupees and include GST. Shipping is shown at
        checkout, and{" "}
        <Link href="/shipping">our shipping page</Link> tells you what it will be
        before you get there.
      </p>
      <p>
        If a poster is listed at an obviously wrong price — a decimal in the
        wrong place — we&apos;ll contact you rather than silently ship or
        silently cancel. You can pay the right price or get a full refund.
      </p>

      <h2>Custom artwork: the important bit</h2>
      <p>
        When you upload an image to our <Link href="/custom">custom poster page</Link>,
        you are telling us that <strong>you have the right to print it</strong>{" "}
        — that you own it, or you have permission from whoever does.
      </p>
      <p>
        We can&apos;t verify that, and we don&apos;t try to. So if you upload
        someone else&apos;s copyrighted work and they come after us for printing
        it, that&apos;s on you, not us. Please don&apos;t put us in that
        position.
      </p>
      <p>
        We may refuse to print anything illegal, hateful, or sexually explicit,
        and we&apos;ll refund you if we do. This is not a close call and we
        won&apos;t debate it.
      </p>
      <p>
        Uploading your image gives us permission to print it for your order and
        nothing else. You keep every right you had in it.
      </p>

      <h2>Our own designs</h2>
      <p>
        The posters we sell, our photography, and the site itself are ours. Buying
        a poster buys you the poster — not the right to reproduce or resell the
        design.
      </p>

      <h2>Colour and print</h2>
      <p>
        Screens are backlit and paper is not. We calibrate carefully, but a
        printed colour will never be identical to the one glowing on your phone.
        A small difference is normal and isn&apos;t a defect.
      </p>
      <p>
        A print that is obviously wrong — banded, streaked, cropped incorrectly,
        the wrong image — is a defect, and we&apos;ll reprint it free. See{" "}
        <Link href="/returns">returns</Link>.
      </p>

      <h2>Returns</h2>
      <p>
        Damaged or misprinted posters are replaced free within{" "}
        {REPLACEMENT_WINDOW_DAYS} days. Because every poster is printed to order,
        we can&apos;t take change-of-mind returns once printing has started. The
        full policy is on the <Link href="/returns">returns page</Link> and forms part
        of these terms.
      </p>

      <h2>Liability</h2>
      <p>
        If we mess up your order, our responsibility is to fix it — reprint it,
        reship it, or refund it. What we won&apos;t accept is liability beyond
        the value of the order itself.
      </p>
      <p>
        Nothing here limits any right you have under Indian consumer law that
        cannot be limited by contract.
      </p>

      <h2>Governing law</h2>
      <p>
        These terms are governed by Indian law, and the courts of {JURISDICTION}{" "}
        have exclusive jurisdiction over any dispute.
      </p>

      <h2>Contact</h2>
      <p>
        Anything unclear here, ask us:{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. We&apos;d
        rather explain a term than have you agree to something you didn&apos;t
        read.
      </p>
    </ProsePage>
  );
}

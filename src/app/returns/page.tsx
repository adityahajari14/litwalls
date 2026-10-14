import type { Metadata } from "next";
import Link from "next/link";

import { ProsePage } from "@/components/ui/prose-page";
import { DAMAGE_PROOF, REPLACEMENT_WINDOW_DAYS, SUPPORT_EMAIL } from "@/lib/company";

export const metadata: Metadata = {
  title: "Returns & refunds",
  description: `Damaged or misprinted? Send ${DAMAGE_PROOF} within ${REPLACEMENT_WINDOW_DAYS} days and we'll reprint it free — no return posting required.`,
};

export default function ReturnsPage() {
  return (
    <ProsePage
      title="Returns & refunds"
      intro="If we got it wrong, we fix it. No posting it back, no arguing."
      updated="14 July 2026"
    >
      <h2>Damaged, misprinted, or wrong</h2>
      <p>
        Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with{" "}
        {DAMAGE_PROOF} within <strong>{REPLACEMENT_WINDOW_DAYS} days</strong> of
        delivery and we&apos;ll reprint your poster and ship a replacement free.
        We ask for a video rather than a photo because it shows the damage and
        the print in one take, which lets us approve the replacement
        immediately instead of writing back for another angle.
      </p>
      <p>
        You don&apos;t need to post the damaged one back to us — return shipping
        would cost more than the reprint, and making you queue at a courier
        counter to fix our mistake is not a policy, it&apos;s a punishment. Keep
        it, bin it, whatever you like.
      </p>
      <p>
        If you&apos;d rather have your money back than a replacement, say so and
        we&apos;ll refund you instead.
      </p>

      <h2>Changed your mind</h2>
      <p>
        Every poster is printed after you order it, specifically for you.
        There&apos;s no shelf to put it back on, so we can&apos;t accept returns
        simply because you&apos;ve changed your mind — a print-to-order shop
        that took those returns would have to charge everyone more to cover it.
      </p>
      <p>
        That said: if your order hasn&apos;t been printed yet, we&apos;ll cancel
        it and refund you in full. Email us as soon as you know. We dispatch
        fast, so this window is short — usually a few hours.
      </p>

      <h2>Custom posters</h2>
      <p>
        The same applies, with one addition: we can&apos;t refund a{" "}
        <Link href="/custom">custom poster</Link> because the uploaded image turned out
        blurry, since we warn you before you pay when a file is too low-resolution
        for the size you picked.
      </p>
      <p>
        If we printed your image wrong — cropped it against your instructions, got
        the colours obviously off, printed the wrong file — that&apos;s our error
        and we&apos;ll reprint it free like any other misprint.
      </p>

      <h2>How refunds are paid</h2>
      <p>
        Refunds go back to the original payment method. Once we process it,
        it&apos;s typically 5–7 working days before it lands, depending on your
        bank — that leg is out of our hands.
      </p>

      <h2>What we&apos;ll ask you for</h2>
      <ul>
        <li>
          <span>Your order number (it&apos;s in your confirmation email).</span>
        </li>
        <li>
          <span>
            A photo of the problem. A phone snap is fine — we&apos;re not
            assessing your photography.
          </span>
        </li>
      </ul>
      <p>That&apos;s it. We&apos;re not going to make you fill in a form.</p>
    </ProsePage>
  );
}

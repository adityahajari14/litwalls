import type { Metadata } from "next";

import { ButtonLink } from "@/components/ui/button";
import { ProsePage } from "@/components/ui/prose-page";
import { SUPPORT_EMAIL } from "@/lib/company";

export const metadata: Metadata = {
  title: "About",
  description:
    "Why Litwalls exists: proper 300gsm matte posters at a price that doesn't make you think twice, printed in India.",
};

export default function AboutPage() {
  return (
    <ProsePage
      title="About Litwalls"
      intro="We started Litwalls because the posters we wanted to buy were either beautiful and unaffordable, or cheap and embarrassing. There was nothing in between."
    >
      <h2>The problem with cheap posters</h2>
      <p>
        Most posters sold online in India are printed on 150gsm glossy stock.
        You can tell within a week: the paper curls at the corners, the glare
        from your lamp washes out half the image, and the colours turn muddy
        after a few months of daylight.
      </p>
      <p>
        The good stuff — proper gallery prints — starts around ₹2,000 for
        something small. That&apos;s a reasonable price for a reasonable
        product. It&apos;s just not a price most people are going to pay to fill
        a hostel room or a first apartment.
      </p>

      <h2>What we do instead</h2>
      <p>
        Every Litwalls poster is printed on <strong>300gsm matte
        paper</strong>. It&apos;s thick enough to hang flat without curling, and
        the matte surface means no glare — you can actually look at it from an
        angle. Every file is colour-checked before it goes on the press, so what
        arrives matches what you saw on screen.
      </p>
      <p>
        We keep it affordable by doing less: no frames, no middlemen, no retail
        space, no licensing deals that add ₹400 to the sticker. We print in
        India, we ship from India, and we start at ₹79.
      </p>

      <h2>Printed to order</h2>
      <p>
        Nothing sits in a warehouse. Your poster is printed after you order it,
        which is why we can offer thousands of designs without a stockroom — and
        why we can print{" "}
        <a href="/custom">whatever image you send us</a> on the same paper, at
        the same quality, for the same price.
      </p>

      <h2>If we get it wrong</h2>
      <p>
        Sometimes a courier folds something they shouldn&apos;t. Send us a photo
        and we&apos;ll reprint it and ship a replacement free — you don&apos;t
        need to post the damaged one back, and we&apos;re not going to argue with
        you about it. The full policy is on our{" "}
        <a href="/returns">returns page</a>, but that&apos;s the whole of it.
      </p>

      <h2>Talk to us</h2>
      <p>
        Litwalls is a small operation, which means the person answering{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> is the person
        who packed your order. If something&apos;s wrong, or you want something
        we don&apos;t sell, just ask.
      </p>

      <div className="mt-10 flex flex-wrap gap-3">
        <ButtonLink href="/products">Browse posters</ButtonLink>
        <ButtonLink href="/custom" variant="ghost">
          Make a custom one
        </ButtonLink>
      </div>
    </ProsePage>
  );
}

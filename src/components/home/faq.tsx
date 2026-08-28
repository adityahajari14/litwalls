import { Accordion } from "@/components/ui/accordion";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  bundleFreeCount,
  FIRST_ORDER_CODE,
  FIRST_ORDER_DISCOUNT,
  FIRST_ORDER_MINIMUM,
  FLAT_SHIPPING_FEE,
  FREE_SHIPPING_THRESHOLD,
  GIFT_DESCRIPTION,
  GIFT_THRESHOLD,
  SINGLE_BUNDLES,
  SPLIT_BUNDLES,
} from "@/lib/offers";

const FAQS = [
  {
    question: "What paper do you print on?",
    answer:
      "Every poster is printed on 300gsm matte paper. It's thick enough to hang without curling, and the matte finish means no glare from lamps or windows, unlike the thinner stock many low-cost prints use.",
  },
  {
    question: "What sizes are available, and how do I choose?",
    answer:
      "A5 (148×210mm) suits a desk or a gallery cluster. A4 (210×297mm) is the safe default for most walls. A3 (297×420mm) is the statement size — pick it if the poster is going above a bed or sofa. 13″×19″ is the largest we print. Split posters spread one image across three panels for a wider wall.",
  },
  {
    question: "How long does delivery take?",
    answer:
      "We dispatch within 24 hours of your order. Metro cities usually receive in 3–4 days; the rest of India in 4–7 days. You'll get a tracking link by SMS and email as soon as it ships.",
  },
  {
    question: "How much is delivery?",
    answer:
      `Free on orders over ₹${FREE_SHIPPING_THRESHOLD}. Below that it's a flat ₹${FLAT_SHIPPING_FEE} anywhere in India. There are no surprise charges at checkout — the price you see is the price you pay.`,
  },
  {
    question: "What offers can I use?",
    answer:
      `On single posters, buy ${SINGLE_BUNDLES.map((b) => `${b.pay} and get ${bundleFreeCount(b)} free`).join(", buy ")} — mix and match any design. On split-in-3 sets, buy ${SPLIT_BUNDLES.map((b) => `${b.pay} and get ${bundleFreeCount(b)} free`).join(", or buy ")}. Orders over ₹${FIRST_ORDER_MINIMUM} qualify for ₹${FIRST_ORDER_DISCOUNT} off with code ${FIRST_ORDER_CODE}; we'll suggest it in your cart once your order reaches that amount. Orders over ₹${GIFT_THRESHOLD} that aren't already using a bundle discount receive ${GIFT_DESCRIPTION}, free — pick which one in your cart. Only one of the bundle discount or the free gift applies per order — whichever is worth more.`,
  },
  {
    question: "What if my poster arrives damaged or blurred?",
    answer:
      "Send us a short video of the print within 7 days and we'll ship a replacement, free — you keep the original, and there's no return shipping required. We ask for a video rather than a photo because it lets us approve the replacement immediately, without back and forth. Posters are shipped rolled in a rigid tube, so damage is rare, but it can still happen in transit.",
  },
  {
    question: "Can I print my own photo or design?",
    answer:
      `Yes. Upload any image on our Custom page and we'll print it as a single poster, a three-panel split poster, mini pocket prints or retro prints. Mini prints start at ₹99 for a pack of 5. We check your file's resolution at upload and let you know before checkout if it's too small to print sharply at your chosen size.`,
  },
  {
    question: "Do you do bulk or corporate orders?",
    answer:
      "We do — cafés, offices, gyms, and college fests. Orders over 25 posters get tiered pricing. Email hello@litwalls.in with what you need and we'll quote within a day.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="bg-paper py-16 lg:py-24">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
          <div>
            <SectionHeading title="FAQ" />
            <p className="mt-3 text-ink-600 text-pretty">
              Have a question we haven&apos;t covered? Email{" "}
              <a
                href="mailto:hello@litwalls.in"
                className="font-medium text-brand-600 underline underline-offset-4"
              >
                hello@litwalls.in
              </a>{" "}
              and a real person will reply within a day.
            </p>
          </div>

          <Accordion items={FAQS} />
        </div>
      </Container>
    </section>
  );
}

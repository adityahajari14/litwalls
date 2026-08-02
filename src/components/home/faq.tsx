import { Accordion } from "@/components/ui/accordion";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";

const FAQS = [
  {
    question: "What paper quality do you use for posters?",
    answer:
      "Every poster is printed on 300gsm museum-grade matte paper. It's thick enough to hang without curling, and the matte finish means no glare from lamps or windows — unlike the glossy 150gsm stock most cheap prints use.",
  },
  {
    question: "What sizes are available, and how do I choose?",
    answer:
      "A5 (148×210mm) suits a desk or a gallery cluster. A4 (210×297mm) is the safe default for most walls. A3 (297×420mm) is the statement size — pick it if the poster is going above a bed or sofa.",
  },
  {
    question: "How long does delivery take?",
    answer:
      "We dispatch within 24 hours of your order. Metro cities usually receive in 3–4 days; the rest of India in 4–7 days. You'll get a tracking link by SMS and email as soon as it ships.",
  },
  {
    question: "How much is shipping?",
    answer:
      "Free on orders over ₹499. Below that it's a flat ₹49 anywhere in India. There are no surprise charges at checkout.",
  },
  {
    question: "What if my poster arrives damaged?",
    answer:
      "Send us a photo within 7 days and we'll ship a replacement free — no return shipping, no arguing. Posters travel rolled in a rigid tube, so this is rare, but couriers are couriers.",
  },
  {
    question: "Can I print my own design?",
    answer:
      "Yes. Upload any image on our Custom page, pick a size, and we print it on the same paper as everything else. We check your file's resolution as you upload it and tell you before you pay if it's too small to print sharply at the size you picked.",
  },
  {
    question: "Do you do bulk or corporate orders?",
    answer:
      "We do — cafés, offices, gyms, and college fests. Orders over 25 posters get tiered pricing. Email hello@litwalls.in with what you need and we'll quote within a day.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="bg-white py-16 lg:py-24">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
          <div>
            <SectionHeading title="FAQ" />
            <p className="mt-3 text-ink-600 text-pretty">
              Still stuck? Email{" "}
              <a
                href="mailto:hello@litwalls.in"
                className="font-medium text-brand-600 underline underline-offset-4"
              >
                hello@litwalls.in
              </a>{" "}
              and a human replies within a day.
            </p>
          </div>

          <Accordion items={FAQS} />
        </div>
      </Container>
    </section>
  );
}

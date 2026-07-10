import { LeafIcon, SparkIcon, TagIcon, TruckIcon } from "@/components/icons";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";

const REASONS = [
  {
    icon: LeafIcon,
    title: "Paper you can feel",
    body: "300gsm museum-grade matte stock. No glare, no flimsy curl, no cheap gloss finish that ruins the artwork.",
  },
  {
    icon: TagIcon,
    title: "Honest pricing",
    body: "Posters start at ₹149. No inflated 'original' price we quietly discount from — what you see is the real price.",
  },
  {
    icon: SparkIcon,
    title: "Art that's actually good",
    body: "Every print is colour-corrected by hand before it goes live. If it wouldn't hang on our wall, it isn't on the site.",
  },
  {
    icon: TruckIcon,
    title: "It arrives safe",
    body: "Rolled in a rigid tube, never folded. Dispatched within 24 hours, tracked all the way to your door.",
  },
];

export function WhyChooseUs() {
  return (
    <section className="bg-white py-16 lg:py-24">
      <Container>
        <SectionHeading
          title="Why choose us"
          subtitle="Four reasons your poster is worth hanging."
        />

        <ul className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {REASONS.map((reason) => (
            <li key={reason.title}>
              <div className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                <reason.icon className="size-6" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-ink-950">
                {reason.title}
              </h3>
              <p className="mt-2 text-sm/6 text-ink-600 text-pretty">
                {reason.body}
              </p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

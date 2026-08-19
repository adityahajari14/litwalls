import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  ChatIcon,
  PrinterIcon,
  TruckIcon,
  UploadIcon,
} from "@/components/icons";

/**
 * What happens between the order and the wall.
 *
 * Credibility on a store nobody has heard of comes from specificity, not
 * adjectives. A visitor cannot verify "premium quality", but they can verify
 * "300gsm matte" against any other store, and a claim precise enough to be
 * checked reads as one the seller expects to be held to.
 *
 * Every number here is one the business can actually keep. Nothing about
 * museum archives, gallery standards or lightfastness ratings we have not
 * tested — an over-claim a customer catches costs more than the claim gained.
 */

const STEPS = [
  {
    icon: UploadIcon,
    title: "You pick or upload",
    body: "Choose from the catalogue, or send your own image. Custom uploads get a resolution check before you pay, so nothing prints soft.",
  },
  {
    icon: PrinterIcon,
    title: "We print it on 300gsm matte",
    body: "Thick, uncoated matte stock — heavy enough to hang flat without curling, and no glare under a lamp or a window.",
  },
  {
    icon: TruckIcon,
    title: "It ships rolled, not folded",
    body: "Every order travels in a rigid tube. Dispatched within 24 hours, with a tracking link by SMS and email.",
  },
  {
    icon: ChatIcon,
    title: "A real person answers",
    body: "Questions before or after the order go to the same inbox, answered within a working day. No bot, no ticket queue.",
  },
];

const SPECS = [
  { label: "Paper", value: "300gsm matte" },
  { label: "Finish", value: "Uncoated, non-glare" },
  { label: "Packing", value: "Rigid tube" },
  { label: "Dispatch", value: "Within 24 hours" },
];

export function HowWePrint() {
  return (
    <section className="bg-white py-16 lg:py-24">
      <Container>
        <SectionHeading
          title="How your poster gets made"
          subtitle="Four steps, and the specs we hold ourselves to on every one of them."
        />

        <div className="mt-10 grid gap-10 lg:grid-cols-[1.7fr_1fr] lg:gap-16">
          <ol className="grid gap-x-8 gap-y-9 sm:grid-cols-2">
            {STEPS.map((step, index) => (
              <li key={step.title}>
                <div className="flex items-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                    <step.icon className="size-5.5" />
                  </span>
                  <span className="font-display text-sm tracking-widest text-ink-400">
                    STEP {index + 1}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-ink-950">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm/6 text-ink-600 text-pretty">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>

          {/* A spec table, not more prose. It invites comparison with any other
              store, which is the point — most won't state theirs. */}
          <div className="rounded-card bg-ink-950 p-8">
            <h3 className="font-display text-2xl text-white">
              The spec, in full
            </h3>
            <dl className="mt-6 space-y-0">
              {SPECS.map((spec) => (
                <div
                  key={spec.label}
                  className="flex items-baseline justify-between gap-4 border-b border-white/10 py-3.5"
                >
                  <dt className="text-sm text-ink-400">{spec.label}</dt>
                  <dd className="text-sm font-semibold text-white">
                    {spec.value}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-6 text-sm/6 text-ink-400 text-pretty">
              If a print reaches you damaged or blurred, send us a short video
              and the replacement ships free.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}

import { LeafIcon, ReturnIcon, ShieldIcon, TruckIcon } from "@/components/icons";
import { Container } from "@/components/ui/container";
import { DAMAGE_PROOF } from "@/lib/company";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/offers";

const ITEMS = [
  {
    icon: TruckIcon,
    title: `Free delivery over ₹${FREE_SHIPPING_THRESHOLD}`,
    body: "Dispatched in 24 hours, delivered in 3–6 days.",
  },
  {
    icon: LeafIcon,
    title: "300gsm matte paper",
    body: "Thick, non-glare stock that hangs flat without curling.",
  },
  {
    icon: ReturnIcon,
    title: "Free replacement on damage",
    body: `If it arrives damaged or blurred, send ${DAMAGE_PROOF} and we'll send a replacement.`,
  },
  {
    icon: ShieldIcon,
    title: "Secure checkout",
    body: "UPI, cards and net banking. Encrypted end to end.",
  },
];

export function TrustStrip() {
  return (
    <section aria-label="Why you can buy with confidence" className="border-b border-ink-100 bg-white">
      <Container className="py-7 sm:py-8 lg:py-10">
        <ul className="reveal-stagger grid grid-cols-2 gap-x-5 gap-y-6 sm:gap-x-8 lg:grid-cols-4">
          {ITEMS.map((item) => (
            <li key={item.title} className="flex min-w-0 flex-col gap-2.5 sm:flex-row sm:gap-3.5">
              <item.icon className="mt-0.5 size-5 shrink-0 text-brand-500 sm:size-6" />
              <div className="min-w-0">
                <p className="text-xs leading-relaxed font-semibold text-ink-950 sm:text-sm">{item.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-600 text-pretty sm:text-sm">{item.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

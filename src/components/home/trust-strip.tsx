import { LeafIcon, ReturnIcon, ShieldIcon, TruckIcon } from "@/components/icons";
import { Container } from "@/components/ui/container";

const ITEMS = [
  {
    icon: TruckIcon,
    title: "Free shipping over ₹499",
    body: "Dispatched in 24 hours, delivered in 3–5 days.",
  },
  {
    icon: LeafIcon,
    title: "300gsm matte paper",
    body: "Museum-grade stock that never glares under light.",
  },
  {
    icon: ReturnIcon,
    title: "7-day easy returns",
    body: "Damaged or not what you expected? We replace it.",
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
      <Container className="py-10">
        <ul className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((item) => (
            <li key={item.title} className="flex gap-3.5">
              <item.icon className="mt-0.5 size-6 shrink-0 text-brand-500" />
              <div>
                <p className="text-sm font-semibold text-ink-950">{item.title}</p>
                <p className="mt-1 text-sm text-ink-600 text-pretty">{item.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

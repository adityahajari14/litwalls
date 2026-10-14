import type { Metadata } from "next";
import Link from "next/link";

import { InstagramIcon, MailIcon } from "@/components/icons";
import { Container } from "@/components/ui/container";
import {
  DAMAGE_PROOF,
  SUPPORT_EMAIL,
  SUPPORT_HOURS,
  SUPPORT_RESPONSE,
} from "@/lib/company";

export const metadata: Metadata = {
  title: "Contact us",
  description: `Questions about an order, a print, or a bulk enquiry? Email ${SUPPORT_EMAIL} and a human replies ${SUPPORT_RESPONSE}.`,
};

/**
 * Deliberately not a contact form.
 *
 * A form here would need a backend, a spam defence, and somewhere for the
 * message to land — and it would still just send an email, only slower and
 * with no copy in the customer's sent folder. Publishing the address is more
 * honest and gets a faster reply.
 */
const CHANNELS = [
  {
    icon: MailIcon,
    title: "Email",
    detail: SUPPORT_EMAIL,
    href: `mailto:${SUPPORT_EMAIL}`,
    note: `A human replies ${SUPPORT_RESPONSE}.`,
  },
  {
    icon: InstagramIcon,
    title: "Instagram",
    detail: "@litwalls",
    href: "https://instagram.com",
    note: "DMs are open, though email is faster for order problems.",
  },
];

const SHORTCUTS = [
  {
    question: "Where's my order?",
    answer:
      "Tracking lives on your account page, and we email a link the moment it ships.",
    href: "/account",
    cta: "Check your orders",
  },
  {
    question: "It arrived damaged.",
    answer:
      `Send ${DAMAGE_PROOF} and we'll reprint it free. No return posting, no arguing.`,
    href: "/returns",
    cta: "Read the policy",
  },
  {
    question: "I need 25+ posters.",
    answer: "Tiered pricing for cafés, offices, gyms and college fests.",
    href: "/bulk",
    cta: "Bulk orders",
  },
];

export default function ContactPage() {
  return (
    <Container className="py-12 lg:py-16">
      <header className="max-w-2xl">
        <h1 className="font-display text-5xl text-ink-950 sm:text-6xl">
          Contact us
        </h1>
        <p className="mt-4 text-lg text-ink-600 text-pretty">
          Litwalls is small enough that the person who answers your email is the
          person who packed your order. {SUPPORT_HOURS}.
        </p>
      </header>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:max-w-3xl">
        {CHANNELS.map((channel) => (
          <a
            key={channel.title}
            href={channel.href}
            className="group rounded-card border border-ink-200 bg-white p-6 transition-colors hover:border-brand-400"
          >
            <div className="grid size-11 place-items-center rounded-full bg-brand-50 text-brand-600">
              <channel.icon className="size-5" />
            </div>
            <h2 className="mt-4 text-sm font-semibold text-ink-950">
              {channel.title}
            </h2>
            <p className="mt-1 font-medium text-brand-600 group-hover:underline group-hover:underline-offset-4">
              {channel.detail}
            </p>
            <p className="mt-2 text-sm text-ink-600 text-pretty">
              {channel.note}
            </p>
          </a>
        ))}
      </div>

      <section className="mt-16">
        <h2 className="font-display text-3xl text-ink-950">
          Faster than emailing us
        </h2>
        <p className="mt-2 text-ink-600">
          These three cover most of what people write in about.
        </p>

        <ul className="mt-8 grid gap-4 lg:grid-cols-3">
          {SHORTCUTS.map((shortcut) => (
            <li
              key={shortcut.question}
              className="rounded-card border border-ink-200 bg-white p-6"
            >
              <h3 className="font-medium text-ink-950">{shortcut.question}</h3>
              <p className="mt-2 text-sm text-ink-600 text-pretty">
                {shortcut.answer}
              </p>
              <Link
                href={shortcut.href}
                className="mt-4 inline-block text-sm font-medium text-brand-600 underline underline-offset-4"
              >
                {shortcut.cta}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </Container>
  );
}

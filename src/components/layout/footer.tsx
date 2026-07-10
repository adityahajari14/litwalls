import Image from "next/image";
import Link from "next/link";

import { ArrowRightIcon, InstagramIcon, TwitterIcon } from "@/components/icons";
import { Container } from "@/components/ui/container";
import { FOOTER_NAV } from "@/lib/navigation";

const PAYMENT_METHODS = ["UPI", "Visa", "Mastercard", "RuPay", "Net Banking"];

export function Footer() {
  return (
    <footer className="mt-24 border-t border-ink-200 bg-white">
      <Container className="py-14 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_2fr]">
          <div className="max-w-sm">
            <Image
              src="/brand/logo.png"
              alt="Litwalls"
              width={156}
              height={75}
              className="h-9 w-auto"
            />
            <p className="mt-4 text-sm text-ink-600 text-pretty">
              Museum-grade posters of the movies, music and anime you love.
              Printed in India, shipped to your wall.
            </p>

            <form className="mt-6">
              <label
                htmlFor="newsletter"
                className="text-sm font-medium text-ink-900"
              >
                Get 10% off your first order
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  id="newsletter"
                  type="email"
                  required
                  placeholder="you@email.com"
                  className="h-11 w-full min-w-0 rounded-full border border-ink-200 bg-paper px-4 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none"
                />
                <button
                  type="submit"
                  aria-label="Subscribe"
                  className="grid size-11 shrink-0 place-items-center rounded-full bg-ink-950 text-white transition-colors hover:bg-brand-500"
                >
                  <ArrowRightIcon className="size-5" />
                </button>
              </div>
            </form>

            <div className="mt-6 flex gap-2">
              <Link
                href="https://instagram.com"
                aria-label="Litwalls on Instagram"
                className="grid size-10 place-items-center rounded-full border border-ink-200 text-ink-600 transition-colors hover:border-ink-950 hover:text-ink-950"
              >
                <InstagramIcon className="size-5" />
              </Link>
              <Link
                href="https://x.com"
                aria-label="Litwalls on X"
                className="grid size-10 place-items-center rounded-full border border-ink-200 text-ink-600 transition-colors hover:border-ink-950 hover:text-ink-950"
              >
                <TwitterIcon className="size-5" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {FOOTER_NAV.map((group) => (
              <nav key={group.title} aria-label={group.title}>
                <h3 className="text-sm font-semibold text-ink-950">
                  {group.title}
                </h3>
                <ul className="mt-4 space-y-3">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-ink-600 transition-colors hover:text-brand-600"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-ink-200 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-500">
            © {new Date().getFullYear()} Litwalls. All rights reserved.
          </p>
          <ul className="flex flex-wrap items-center gap-2">
            {PAYMENT_METHODS.map((method) => (
              <li
                key={method}
                className="rounded-md border border-ink-200 px-2.5 py-1 text-xs font-medium text-ink-500"
              >
                {method}
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </footer>
  );
}

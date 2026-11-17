import Image from "next/image";
import Link from "next/link";

import { ArrowRightIcon, InstagramIcon, ShieldIcon } from "@/components/icons";
import { SubscribeForm } from "@/components/marketing/subscribe-form";
import { PAYMENT_METHODS } from "@/components/payment-icons";
import { Container } from "@/components/ui/container";
import { INSTAGRAM_URL, SUPPORT_EMAIL } from "@/lib/company";
import { SUBSCRIBE_DISCOUNT_PERCENT } from "@/lib/marketing";
import { FOOTER_NAV } from "@/lib/navigation";
import { getCollections } from "@/lib/shopify/products";
import styles from "./footer.module.css";

const FOOTER_COLLECTION_COUNT = 4;

export async function Footer() {
  // The same cached navigation batch as the header, before limiting visible links.
  const collections = await getCollections(12);
  const hasMore = collections.length > FOOTER_COLLECTION_COUNT;
  const shopGroup = {
    title: "Shop",
    links: [
      { label: "All posters", href: "/products" },
      ...collections.slice(0, FOOTER_COLLECTION_COUNT).map((collection) => ({
        label: collection.title,
        href: `/collections/${collection.handle}`,
      })),
      ...(hasMore ? [{ label: "All collections", href: "/collections" }] : []),
    ],
  };

  return (
    <footer className={styles.footer}>
      <Container>
        <section className={styles.newsletter} aria-labelledby="footer-newsletter-title">
          <div>
            <p className={styles.eyebrow}>The Litwalls list</p>
            <h2 id="footer-newsletter-title">Get {SUBSCRIBE_DISCOUNT_PERCENT}% off your first order.</h2>
            <p className={styles.newsletterCopy}>New prints, fresh inspiration, and offers worth opening.</p>
          </div>
          <div className={styles.signupArea}>
            <label htmlFor="newsletter" className="sr-only">Email address</label>
            <SubscribeForm id="newsletter" className={styles.signup} source="footer" buttonLabel="Subscribe" />
          </div>
        </section>

        <div className={styles.main}>
          <div className={styles.brand}>
            <Link href="/" aria-label="Litwalls home" className={styles.logo}>
              <Image src="/brand/logo.png" alt="Litwalls" width={156} height={75} className={styles.logoImage} />
            </Link>
            <p className={styles.brandCopy}>Posters of everything you love, on 300gsm matte paper. Printed to order, shipped to your wall.</p>
            <a href={`mailto:${SUPPORT_EMAIL}`} className={styles.email}>{SUPPORT_EMAIL}<ArrowRightIcon className="size-3.5" aria-hidden="true" /></a>
            <div className={styles.socials}>
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Litwalls on Instagram"><InstagramIcon className="size-4.5" aria-hidden="true" /></a>
            </div>
          </div>

          <div className={styles.navigation}>
            {[shopGroup, ...FOOTER_NAV].map((group) => (
              <nav key={group.title} aria-label={group.title}>
                <h3>{group.title}</h3>
                <ul>
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href}>{link.label}{link.href === "/collections" ? <ArrowRightIcon className="size-3" aria-hidden="true" /> : null}</Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <aside className={styles.artworkNote} aria-labelledby="footer-artwork-note">
          <h3 id="footer-artwork-note">Artwork note</h3>
          <p>
            All artwork on this site is fan art and is not presented as official
            merchandise unless stated otherwise. If you have any concern about
            artwork published here, write to us at{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>{" "}
            and we will respond promptly.
          </p>
        </aside>

        <div className={styles.bottom}>
          <p>© {new Date().getFullYear()} Litwalls. All rights reserved.</p>
          <div className={styles.payments}>
            <span className={styles.secure}><ShieldIcon className="size-3.5" aria-hidden="true" />Secure checkout</span>
            <ul aria-label="Accepted payment methods">
              {PAYMENT_METHODS.map(({ name, Icon }) => <li key={name} title={name}><Icon /></li>)}
            </ul>
          </div>
        </div>
      </Container>
    </footer>
  );
}

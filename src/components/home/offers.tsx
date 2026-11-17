import Link from "next/link";

import { ArrowRightIcon, GiftIcon, TagIcon, TruckIcon } from "@/components/icons";
import { Container } from "@/components/ui/container";
import { BundleOffersModal } from "@/components/home/bundle-offers-modal";
import {
  bundleFreeCount,
  FIRST_ORDER_CODE,
  FIRST_ORDER_DISCOUNT,
  FIRST_ORDER_MINIMUM,
  FLAT_SHIPPING_FEE,
  FREE_SHIPPING_THRESHOLD,
  GIFT_THRESHOLD,
  SINGLE_BUNDLES,
  SPLIT_BUNDLES,
} from "@/lib/offers";
import styles from "./offers.module.css";

/** Lead with the entry bundles; the modal carries the complete offer ladder. */
export function Offers() {
  const single = SINGLE_BUNDLES[0];
  const split = SPLIT_BUNDLES[0];

  return (
    <section id="offers" aria-labelledby="offers-title" className={styles.section}>
      <Container>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>A little extra, on us</p>
            <h2 id="offers-title" className={styles.title}>More art. Less spend.</h2>
          </div>
          <p className={styles.intro}>Mix your designs. Bundle savings apply automatically.</p>
        </header>

        <div className={styles.deals}>
          <Link href="/products" className={styles.deal}>
            <div>
              <h3>Single posters</h3>
              <p className={styles.value}>Buy {single.pay}. <span>Get {bundleFreeCount(single)} free.</span></p>
              <p className={styles.detail}>Add {single.total} posters to your cart. Pay for {single.pay}.</p>
            </div>
            <span className={styles.arrow} aria-hidden="true"><ArrowRightIcon className="size-4" /></span>
          </Link>
          <Link href="/#split-posters" className={styles.deal}>
            <div>
              <h3>Split poster sets <span>1 set = 3 panels</span></h3>
              <p className={styles.value}>Buy {split.pay}. <span>Get {bundleFreeCount(split)} free.</span></p>
              <p className={styles.detail}>Add {split.total} sets to your cart. Pay for {split.pay}.</p>
            </div>
            <span className={styles.arrow} aria-hidden="true"><ArrowRightIcon className="size-4" /></span>
          </Link>
        </div>

        <ul className={styles.perks} aria-label="More offers">
          <li>
            <TruckIcon className={styles.icon} aria-hidden="true" />
            <div><h3>Free delivery</h3><p>₹{FREE_SHIPPING_THRESHOLD}+ orders · ₹{FLAT_SHIPPING_FEE} below</p></div>
          </li>
          <li>
            <TagIcon className={styles.icon} aria-hidden="true" />
            <div><h3>₹{FIRST_ORDER_DISCOUNT} off your first order</h3><p>₹{FIRST_ORDER_MINIMUM}+ orders · Use <code>{FIRST_ORDER_CODE}</code> in cart</p></div>
          </li>
          <li>
            <GiftIcon className={styles.icon} aria-hidden="true" />
            <div><h3>5 free photo prints on ₹{GIFT_THRESHOLD}+</h3><p>Mini pocket or retro</p></div>
          </li>
        </ul>

        <BundleOffersModal triggerClassName={styles.allOffers} />
      </Container>
    </section>
  );
}

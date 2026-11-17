"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { ArrowRightIcon, CloseIcon } from "@/components/icons";
import { ButtonLink } from "@/components/ui/button";
import { Overlay } from "@/components/ui/overlay";
import { bundleFreeCount, SINGLE_BUNDLES, SPLIT_BUNDLES, type Bundle } from "@/lib/offers";
import styles from "./bundle-offers-modal.module.css";

function BundleList({ bundles, unit }: { bundles: Bundle[]; unit: "posters" | "sets" }) {
  return (
    <ul className={styles.list}>
      {bundles.map((bundle) => (
        <li key={bundle.total}>
          <p className={styles.offer}>Buy {bundle.pay}, <span>get {bundleFreeCount(bundle)} free</span></p>
          <p className={styles.quantity}>Add <strong>{bundle.total} {unit}</strong> to your cart. Pay for {bundle.pay}.</p>
        </li>
      ))}
    </ul>
  );
}

export function BundleOffersModal({ triggerClassName }: { triggerClassName?: string }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        type="button"
        className={triggerClassName}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        View all bundle offers <ArrowRightIcon className="size-4" aria-hidden="true" />
      </button>

      <Overlay
        open={open}
        onClose={close}
        label="All bundle offers"
        side="center"
        className="z-70"
        panelClassName="max-h-[calc(100svh-2rem)] w-full max-w-3xl overflow-hidden rounded-card bg-paper text-ink-950 shadow-lift"
      >
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>More for your walls</p>
            <h2>All bundle offers</h2>
          </div>
          <button type="button" onClick={close} aria-label="Close offers" className={styles.close}>
            <CloseIcon className="size-5" aria-hidden="true" />
          </button>
        </header>

        <div className={styles.body}>
          <p className={styles.intro}>Pick your designs and add the full quantity, including the free items. Savings apply automatically. <strong>No code needed.</strong></p>

          <div className={styles.groups}>
            <section aria-labelledby="modal-single-offers">
              <h3 id="modal-single-offers">Single posters</h3>
              <p className={styles.subtitle}>Catalogue and custom posters</p>
              <BundleList bundles={SINGLE_BUNDLES} unit="posters" />
              <ButtonLink href="/products" variant="secondary" onClick={close} className={styles.shop}>
                Shop posters <ArrowRightIcon className="size-4" aria-hidden="true" />
              </ButtonLink>
            </section>
            <section aria-labelledby="modal-split-offers">
              <h3 id="modal-split-offers">Split poster sets</h3>
              <p className={styles.subtitle}>1 set = 3 panels</p>
              <BundleList bundles={SPLIT_BUNDLES} unit="sets" />
              <ButtonLink href="/#split-posters" variant="secondary" onClick={close} className={styles.shop}>
                Shop split posters <ArrowRightIcon className="size-4" aria-hidden="true" />
              </ButtonLink>
            </section>
          </div>

          <div className={styles.terms}>
            <p>One bundle discount per order. Free photo-print gifts apply to orders without a bundle discount.</p>
            <Link href="/#faq" onClick={close}>More offer details &amp; FAQs <ArrowRightIcon className="size-3.5" aria-hidden="true" /></Link>
          </div>
        </div>
      </Overlay>
    </>
  );
}

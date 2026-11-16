"use client";

import Image, { getImageProps } from "next/image";
import Link from "next/link";
import {
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

import { ArrowRightIcon } from "@/components/icons";
import { ButtonLink } from "@/components/ui/button";

import styles from "./hero-carousel.module.css";

export type HeroSlide = {
  id: string;
  label: string;
  eyebrow: string;
  lines: string[];
  accent: string;
  description: string;
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
  image: { src: string; alt: string; width?: number; height?: number };
  mobile: {
    image: string;
    lines: string[];
    description: string;
    note: string;
    primaryLabel?: string;
    secondaryLabel?: string;
  };
  showSecondaryOnMobile?: boolean;
  posterWall?: {
    src: string;
    alt: string;
    crop?: { left: number; top: number; width: number; height: number; imageWidth: number; imageHeight: number };
  }[];
  note?: string;
};

function HeroScene({ slide, first }: { slide: HeroSlide; first: boolean }) {
  const common = {
    alt: slide.image.alt,
    sizes: "100vw",
    loading: "eager" as const,
    fetchPriority: first ? "high" as const : "auto" as const,
  };
  const { props: desktop } = getImageProps({
    ...common,
    src: slide.image.src,
    width: slide.image.width ?? 1672,
    height: slide.image.height ?? 941,
  });
  const { props: mobile } = getImageProps({
    ...common,
    src: slide.mobile.image,
    width: 1024,
    height: 1536,
  });

  return (
    <picture>
      <source media="(max-width: 767px)" srcSet={mobile.srcSet} sizes={mobile.sizes} width={1024} height={1536} />
      {/* Art direction follows next/image's getImageProps workflow so the
          browser downloads only the matching phone or desktop composition. */}
      <img {...desktop} className={styles.sceneImage} draggable={false} />
    </picture>
  );
}

export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const suppressSwipeClick = useRef(false);

  function select(index: number) {
    // Keep keyboard focus usable when its current slide becomes inert.
    const root = rootRef.current;
    if (root?.querySelector('[data-active="true"]')?.contains(document.activeElement)) {
      root.focus({ preventScroll: true });
    }
    setActive((index + slides.length) % slides.length);
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      if ((event.target as Element).closest("input, textarea, select, [contenteditable]")) return;
      event.preventDefault();
      select(active + (event.key === "ArrowRight" ? 1 : -1));
    }
  }

  function onPointerDown(event: PointerEvent<HTMLElement>) {
    suppressSwipeClick.current = false;
    if (event.pointerType === "mouse" || !event.isPrimary || (event.target as Element).closest("button")) return;
    touchStart.current = { x: event.clientX, y: event.clientY };
  }

  function onPointerUp(event: PointerEvent<HTMLElement>) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const x = event.clientX - start.x;
    const y = event.clientY - start.y;
    if (Math.abs(x) > 50 && Math.abs(x) > Math.abs(y) * 1.25) {
      event.preventDefault();
      suppressSwipeClick.current = true;
      select(active + (x < 0 ? 1 : -1));
    }
  }

  return (
    <section
      ref={rootRef}
      className={styles.hero}
      aria-label="Litwalls highlights and offers"
      aria-roledescription="carousel"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => { touchStart.current = null; }}
      onClickCapture={(event) => {
        if (suppressSwipeClick.current) {
          event.preventDefault();
          event.stopPropagation();
          suppressSwipeClick.current = false;
        }
      }}
    >
      <h1 className="sr-only">Posters that make your walls talk</h1>
      <div className={styles.slides}>
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            id={`hero-slide-${slide.id}`}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${slides.length}: ${slide.label}`}
            aria-hidden={active !== index}
            inert={active !== index}
            className={styles.slide}
            data-active={active === index}
          >
            <div className={styles.productVisual}>
              <HeroScene slide={slide} first={index === 0} />
              {slide.posterWall ? (
                <div className={styles.posterWall} role="group" aria-label="Posters featured in this bundle">
                  {slide.posterWall.map((poster) => (
                    <div
                      key={poster.src}
                      className={styles.posterPrint}
                      style={poster.crop ? { aspectRatio: `${poster.crop.width} / ${poster.crop.height}` } : undefined}
                    >
                      <Image
                        src={poster.src}
                        alt={poster.alt}
                        width={1000}
                        height={poster.crop?.imageHeight ?? 1048}
                        sizes="(min-width: 2000px) 1100px, (min-width: 1280px) 900px, (min-width: 768px) 650px, 450px"
                        loading="eager"
                        className={styles.cataloguePoster}
                        style={poster.crop ? {
                          width: `${poster.crop.imageWidth / poster.crop.width * 100}%`,
                          height: `${poster.crop.imageHeight / poster.crop.height * 100}%`,
                          left: `${-poster.crop.left / poster.crop.width * 100}%`,
                          top: `${-poster.crop.top / poster.crop.height * 100}%`,
                        } : undefined}
                        draggable={false}
                      />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <div className={styles.body}>
              <div className={styles.copy}>
                <p className={styles.eyebrow}><span aria-hidden="true" />{slide.eyebrow}</p>
                <h2 className={styles.title}>
                  <span className={styles.desktopCopy}>
                    {slide.lines.map((line) => <span key={line}>{line}</span>)}
                  </span>
                  <span className={styles.mobileCopy}>
                    {slide.mobile.lines.map((line) => <span key={line}>{line}</span>)}
                  </span>
                  <em>{slide.accent}</em>
                </h2>
                <p className={styles.description}>
                  <span className={styles.desktopCopy}>{slide.description}</span>
                  <span className={styles.mobileCopy}>{slide.mobile.description}</span>
                </p>
                <div className={styles.actions} data-mobile-secondary={slide.showSecondaryOnMobile || undefined}>
                  <ButtonLink href={slide.primary.href} size="lg" className={styles.shopButton}>
                    <span className={styles.desktopCopy}>{slide.primary.label}</span>
                    <span className={styles.mobileCopy}>{slide.mobile.primaryLabel ?? slide.primary.label}</span>
                    <ArrowRightIcon aria-hidden="true" className="size-4" />
                  </ButtonLink>
                  {slide.secondary ? (
                    <Link href={slide.secondary.href} className={styles.secondaryLink}>
                      <span className={styles.desktopCopy}>{slide.secondary.label}</span>
                      <span className={styles.mobileCopy}>{slide.mobile.secondaryLabel ?? slide.secondary.label}</span>
                      <ArrowRightIcon aria-hidden="true" className="size-3.5" />
                    </Link>
                  ) : null}
                </div>
                <p className={styles.note}>
                  <span className={styles.desktopCopy}>{slide.note}</span>
                  <span className={styles.mobileCopy}>{slide.mobile.note}</span>
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className={styles.controls}>
        <button type="button" className={styles.arrow} aria-label="Previous slide" onClick={() => select(active - 1)}>
          <ArrowRightIcon aria-hidden="true" className="size-5 rotate-180" />
        </button>
        <button type="button" className={styles.arrow} aria-label="Next slide" onClick={() => select(active + 1)}>
          <ArrowRightIcon aria-hidden="true" className="size-5" />
        </button>
      </div>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        Slide {active + 1} of {slides.length}: {slides[active].label}
      </p>
    </section>
  );
}

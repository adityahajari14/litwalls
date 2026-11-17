import Image from "next/image";

import type { CollectionCover } from "@/lib/collection-covers";
import styles from "./collection-artwork.module.css";

/** Coordinated studio artwork, either composed from catalogue prints or a finished cover. */
export function CollectionArtwork({
  cover,
  posterSizes = "(min-width: 1408px) 380px, (min-width: 1024px) 28vw, 56vw",
  sizes = "(min-width: 1408px) 330px, (min-width: 1024px) 25vw, 50vw",
  eager = false,
}: {
  cover: CollectionCover;
  posterSizes?: string;
  sizes?: string;
  eager?: boolean;
}) {
  return (
    <div className={styles.artwork} data-layout={cover.layout} aria-hidden="true">
      <Image src={cover.image ?? "/collections/covers/studio-v2.webp"} alt="" fill sizes={sizes} loading={eager ? "eager" : "lazy"} className={styles.backdrop} />
      {cover.posters.map((poster) => {
        const crop = poster.crop;
        return (
          <span key={poster.id} className={styles.print} data-poster={poster.id}>
            {poster.placeholderText ? (
              <span className={styles.designPlaceholder}>
                <span>{poster.placeholderText.split(" ").map((word, index) => <span key={index}>{word}</span>)}</span>
              </span>
            ) : <Image
              src={poster.src}
              alt=""
              width={crop.imageWidth}
              height={crop.imageHeight}
              sizes={posterSizes}
              loading={eager ? "eager" : "lazy"}
              className={styles.poster}
              style={{
                width: `${crop.imageWidth / crop.width * 100}%`,
                height: `${crop.imageHeight / crop.height * 100}%`,
                left: `${-crop.left / crop.width * 100}%`,
                top: `${-crop.top / crop.height * 100}%`,
              }}
            />}
          </span>
        );
      })}
    </div>
  );
}

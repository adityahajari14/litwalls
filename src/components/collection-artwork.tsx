import Image from "next/image";

import type { CollectionCover } from "@/lib/collection-covers";
import styles from "./collection-artwork.module.css";

/** Shared studio setting with unaltered catalogue prints, cropped in the browser. */
export function CollectionArtwork({
  cover,
  posterSizes = "(min-width: 1408px) 380px, (min-width: 1024px) 28vw, 56vw",
}: {
  cover: CollectionCover;
  posterSizes?: string;
}) {
  return (
    <div className={styles.artwork} aria-hidden="true">
      <Image src="/collections/covers/studio-v2.webp" alt="" fill sizes="(min-width: 1408px) 330px, (min-width: 1024px) 25vw, 50vw" className={styles.backdrop} />
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

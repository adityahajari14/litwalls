import { CollectionArtwork } from "@/components/collection-artwork";
import { PosterFan } from "@/components/poster-fan";
import { COLLECTION_COVERS } from "@/lib/collection-covers";
import { formatMoney } from "@/lib/money";
import type { Image, Money } from "@/lib/shopify/types";
import styles from "./collection-banner.module.css";

export function CollectionBanner({
  handle,
  title,
  description,
  count,
  startingPrice,
  previews,
}: {
  handle: string;
  title: string;
  description: string;
  count: number;
  startingPrice?: Money;
  previews: Image[];
}) {
  const cover = COLLECTION_COVERS[handle];
  const introduction = cover?.tagline || description || "Find a print that feels like you.";

  return (
    <section className={styles.banner} aria-labelledby="collection-title">
      <div className={styles.copy}>
        <p className={styles.eyebrow}><span aria-hidden="true" />The collection</p>
        <h1 id="collection-title" className={styles.title}>{title}</h1>
        <p className={styles.introduction}>{introduction}</p>

        {count > 0 ? (
          <dl className={styles.facts}>
            <div>
              <dt>Designs to explore</dt>
              <dd>{count}<span>print{count === 1 ? "" : "s"}</span></dd>
            </div>
            {startingPrice ? (
              <div>
                <dt>Starting from</dt>
                <dd>{formatMoney(startingPrice)}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </div>

      {cover || previews.length > 0 ? (
        <div className={styles.visual} aria-hidden="true">
          <div className={styles.artwork}>
            {cover ? (
              <CollectionArtwork
                cover={cover}
                sizes="(min-width: 1024px) 500px, (min-width: 640px) 50vw, 100vw"
                posterSizes="(min-width: 2000px) 850px, (min-width: 1024px) 760px, (min-width: 640px) 70vw, 100vw"
                eager
              />
            ) : (
              <PosterFan images={previews} title={title} eager sizes="(min-width: 1024px) 220px, 28vw" />
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

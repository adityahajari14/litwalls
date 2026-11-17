import { ArrowRightIcon, CheckIcon } from "@/components/icons";
import { CollectionArtwork } from "@/components/collection-artwork";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { COLLECTION_COVERS, type CollectionCover } from "@/lib/collection-covers";
import { DISPATCH_HOURS } from "@/lib/company";
import { formatMoney } from "@/lib/money";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/offers";
import { ENTRY_PRICE } from "@/lib/pricing";
import styles from "./closing-cta.module.css";

const cataloguePosters = Object.values(COLLECTION_COVERS).flatMap((cover) => cover?.posters ?? []);

/** A separate catalogue selection from the hero banners, in the shared studio setting. */
const closingArtwork: CollectionCover = {
  tagline: "",
  posters: [
    "superman-03-dc-posters",
    "oppenheimer-01-movies-posters",
    "eminem-04-music-posters",
  ].flatMap(
    (id) => cataloguePosters.filter((poster) => poster.id === id),
  ),
};

export function ClosingCta() {
  const threshold = formatMoney({ amount: String(FREE_SHIPPING_THRESHOLD), currencyCode: "INR" });
  const assurances = [
    `Free delivery over ${threshold}`,
    `Dispatched within ${DISPATCH_HOURS} hours`,
    "Free replacement on damage",
  ];

  return (
    <section id="closing-cta" aria-labelledby="closing-cta-title" className={styles.section}>
      <Container>
        <div className={`${styles.panel} reveal`}>
          <div className={styles.main}>
            <div className={styles.copy}>
              <p className={styles.eyebrow}>Make it your space</p>
              <h2 id="closing-cta-title" className={styles.title}>
                Give your walls{" "}<span>something to say.</span>
              </h2>
              <p className={styles.description}>
                Your favourite worlds, printed on 300gsm matte paper.
                From <strong>₹{ENTRY_PRICE}</strong>, printed to order.
              </p>
              <div className={styles.actions}>
                <ButtonLink href="/products" size="lg" className={styles.primary}>
                  Shop all posters <ArrowRightIcon className="size-4" aria-hidden="true" />
                </ButtonLink>
                <ButtonLink href="/custom" variant="ghost" size="lg" className={styles.secondary}>
                  Upload your own
                </ButtonLink>
              </div>
            </div>

            <div className={styles.visual} aria-hidden="true">
              <CollectionArtwork cover={closingArtwork} posterSizes="(min-width: 1408px) 750px, (min-width: 768px) 55vw, 60vw" />
            </div>
          </div>

          <ul className={styles.assurances}>
            {assurances.map((assurance) => (
              <li key={assurance}><CheckIcon className="size-3.5 shrink-0" aria-hidden="true" />{assurance}</li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}

import Image from "next/image";

import { Container } from "@/components/ui/container";
import { Rating } from "@/components/ui/rating";
import { SectionHeading } from "@/components/ui/section-heading";
import { CheckIcon } from "@/components/icons";
import { IMAGE_PLACEHOLDER } from "@/lib/image-placeholder";
import type { Review } from "@/lib/reviews";

export type { Review };

/**
 * Renders nothing when handed an empty array, so the section can never invent
 * social proof on its own. Whatever it displays came from Judge.me.
 *
 * Customer photos are given real space rather than being a thumbnail beside
 * the text: for a poster, the picture of it hanging on someone's own wall
 * answers the one question the copy cannot.
 */
export function Reviews({
  reviews = [],
  count,
  average,
}: {
  reviews?: Review[];
  /** Store-wide total, which is larger than the handful shown here. */
  count?: number;
  average?: number;
}) {
  if (reviews.length === 0) return null;

  const total = count ?? reviews.length;
  const score =
    average ??
    reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;

  return (
    <section id="reviews" className="scroll-mt-24 bg-white py-16 lg:py-24">
      <Container>
        <SectionHeading
          title="What people say"
          subtitle={`${total.toLocaleString("en-IN")} review${total === 1 ? "" : "s"}, ${score.toFixed(1)} average.`}
        />

        <ul className="reveal-stagger mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {reviews.map((review) => (
            <li
              key={review.id}
              className="flex flex-col overflow-hidden rounded-card border border-ink-200 bg-white"
            >
              {review.pictures.length > 0 ? (
                <div className="relative aspect-4/3 w-full bg-ink-100">
                  <Image
                    src={review.pictures[0]}
                    alt={`Poster bought by ${review.name}`}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                    placeholder={IMAGE_PLACEHOLDER}
                    className="object-cover"
                  />
                </div>
              ) : null}

              <div className="flex flex-1 flex-col p-6">
                <Rating rating={review.rating} />
                {review.title ? (
                  <h3 className="mt-4 font-semibold text-ink-950">
                    {review.title}
                  </h3>
                ) : null}
                <p className="mt-2 flex-1 text-sm/6 text-ink-600 text-pretty">
                  {review.body}
                </p>

                <div className="mt-6 border-t border-ink-100 pt-4">
                  <p className="text-sm font-medium text-ink-900">
                    {review.name}
                  </p>
                  {review.verified || review.product ? (
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-500">
                      {review.verified ? (
                        <>
                          <CheckIcon className="size-3.5 shrink-0 text-success" />
                          Verified purchase
                        </>
                      ) : null}
                      {review.verified && review.product ? " — " : null}
                      {review.product}
                    </p>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

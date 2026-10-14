import Image from "next/image";

import { CheckIcon } from "@/components/icons";
import { Container } from "@/components/ui/container";
import { Rating } from "@/components/ui/rating";
import { IMAGE_PLACEHOLDER } from "@/lib/image-placeholder";
import type { ReviewSummary } from "@/lib/reviews";

/**
 * Reviews for this poster, below the buy rail.
 *
 * Renders nothing when there are none — a "No reviews yet" panel on a new
 * store advertises the absence rather than the product, and there is no
 * version of that which helps.
 *
 * The distribution bars are here because a rating with no shape behind it is
 * the thing shoppers have learned to discount. Seeing that 38 of 41 reviews
 * are five stars and three are not is more persuasive than "4.8" on its own.
 */
export function ProductReviews({ summary }: { summary: ReviewSummary }) {
  if (summary.reviews.length === 0) return null;

  const { reviews, count, average } = summary;

  // Distribution over the reviews actually fetched, which is up to 100 — so it
  // describes the sample on screen rather than claiming to cover every review.
  const buckets = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    total: reviews.filter((review) => review.rating === stars).length,
  }));
  const sample = reviews.length;

  return (
    <section
      id="reviews"
      className="scroll-mt-24 border-t border-ink-100 bg-white py-16 lg:py-24"
    >
      <Container>
        <div className="grid gap-10 lg:grid-cols-[18rem_1fr] lg:gap-16">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <h2 className="font-display text-4xl text-ink-950 sm:text-5xl">
              Reviews
            </h2>

            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-display text-5xl text-ink-950">
                {average.toFixed(1)}
              </span>
              <span className="text-sm text-ink-500">out of 5</span>
            </div>

            <div className="mt-2">
              <Rating rating={average} />
            </div>

            <p className="mt-2 text-sm text-ink-600">
              {count.toLocaleString("en-IN")} review{count === 1 ? "" : "s"}
            </p>

            <ul className="mt-6 space-y-1.5">
              {buckets.map((bucket) => (
                <li key={bucket.stars} className="flex items-center gap-3">
                  <span className="w-8 shrink-0 text-xs text-ink-600 tabular-nums">
                    {bucket.stars}★
                  </span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100">
                    <span
                      className="block h-full rounded-full bg-brand-500"
                      style={{
                        width: `${sample ? (bucket.total / sample) * 100 : 0}%`,
                      }}
                    />
                  </span>
                  <span className="w-6 shrink-0 text-right text-xs text-ink-500 tabular-nums">
                    {bucket.total}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <ul className="space-y-6">
            {reviews.map((review) => (
              <li
                key={review.id}
                className="rounded-card border border-ink-200 bg-white p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Rating rating={review.rating} />
                  {review.createdAt ? (
                    <time
                      dateTime={review.createdAt}
                      className="text-xs text-ink-500"
                    >
                      {new Date(review.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </time>
                  ) : null}
                </div>

                {review.title ? (
                  <h3 className="mt-3 font-semibold text-ink-950">
                    {review.title}
                  </h3>
                ) : null}

                <p className="mt-2 text-sm/6 text-ink-600 text-pretty">
                  {review.body}
                </p>

                {review.pictures.length > 0 ? (
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {review.pictures.slice(0, 4).map((picture) => (
                      <li key={picture}>
                        <div className="relative size-24 overflow-hidden rounded-card bg-ink-100 sm:size-28">
                          <Image
                            src={picture}
                            alt={`Photo from ${review.name}'s review`}
                            fill
                            sizes="7rem"
                            placeholder={IMAGE_PLACEHOLDER}
                            className="object-cover"
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : null}

                <p className="mt-4 flex flex-wrap items-center gap-x-1.5 text-xs text-ink-500">
                  <span className="font-medium text-ink-900">{review.name}</span>
                  {review.verified ? (
                    <span className="flex items-center gap-1">
                      <CheckIcon className="size-3.5 shrink-0 text-success" />
                      Verified purchase
                    </span>
                  ) : null}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}

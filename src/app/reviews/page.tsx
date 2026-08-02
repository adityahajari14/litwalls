import type { Metadata } from "next";

import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Rating } from "@/components/ui/rating";
import { SUPPORT_EMAIL } from "@/lib/company";
import { getReviews } from "@/lib/reviews";

export const metadata: Metadata = {
  title: "Reviews",
  description: "What Litwalls customers say about the paper, the print and the post.",
};

export default async function ReviewsPage() {
  const reviews = await getReviews();

  if (reviews.length === 0) {
    return (
      <Container className="py-12 lg:py-16">
        <header className="max-w-2xl">
          <h1 className="font-display text-5xl text-ink-950 sm:text-6xl">
            Reviews
          </h1>
          <p className="mt-4 text-lg text-ink-600 text-pretty">
            We don&apos;t have any yet — and we&apos;d rather show you an empty
            page than invent some.
          </p>
        </header>

        <div className="mt-10 max-w-2xl rounded-card border border-ink-200 bg-white p-8">
          <h2 className="font-display text-2xl text-ink-950">
            Be the first to tell us
          </h2>
          <p className="mt-2 text-ink-600 text-pretty">
            If you&apos;ve ordered from us, email{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="font-medium text-brand-600 underline underline-offset-4"
            >
              {SUPPORT_EMAIL}
            </a>{" "}
            and tell us what you thought — good or bad. We publish both.
          </p>
          <ButtonLink href="/products" className="mt-6">
            Browse posters
          </ButtonLink>
        </div>
      </Container>
    );
  }

  const average =
    reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;

  return (
    <Container className="py-12 lg:py-16">
      <header className="max-w-2xl">
        <h1 className="font-display text-5xl text-ink-950 sm:text-6xl">
          Reviews
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Rating rating={average} />
          <p className="text-ink-600">
            <span className="font-medium text-ink-950">
              {average.toFixed(1)}
            </span>{" "}
            average from {reviews.length.toLocaleString("en-IN")} review
            {reviews.length === 1 ? "" : "s"}
          </p>
        </div>
      </header>

      <ul className="mt-12 grid gap-6 lg:grid-cols-3">
        {reviews.map((review) => (
          <li
            key={`${review.name}-${review.title}`}
            className="flex flex-col rounded-card border border-ink-200 bg-white p-6"
          >
            <Rating rating={review.rating} />
            <h2 className="mt-4 font-semibold text-ink-950">{review.title}</h2>
            <p className="mt-2 flex-1 text-sm/6 text-ink-600 text-pretty">
              {review.body}
            </p>

            <div className="mt-6 border-t border-ink-100 pt-4">
              <p className="text-sm font-medium text-ink-900">
                {review.name}
                <span className="font-normal text-ink-500">
                  {" "}
                  · {review.location}
                </span>
              </p>
              <p className="mt-0.5 text-xs text-ink-500">
                Verified purchase — {review.product}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </Container>
  );
}

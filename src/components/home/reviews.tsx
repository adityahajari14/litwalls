import { Container } from "@/components/ui/container";
import { Rating } from "@/components/ui/rating";
import { SectionHeading } from "@/components/ui/section-heading";

export type Review = {
  name: string;
  location: string;
  rating: number;
  title: string;
  body: string;
  product: string;
};

/**
 * Real reviews only. Wire this to a reviews app (Judge.me, Loox, or a Shopify
 * metafield) and pass them in — the section renders nothing while empty rather
 * than inventing social proof.
 */
export function Reviews({ reviews = [] }: { reviews?: Review[] }) {
  if (reviews.length === 0) return null;

  const average =
    reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;

  return (
    <section id="reviews" className="bg-ink-50 py-16 lg:py-24">
      <Container>
        <SectionHeading
          title="What people say"
          subtitle={`${reviews.length.toLocaleString("en-IN")} reviews, ${average.toFixed(1)} average.`}
          href="/reviews"
          linkLabel="Read all reviews"
        />

        <ul className="mt-10 grid gap-6 lg:grid-cols-3">
          {reviews.map((review) => (
            <li
              key={`${review.name}-${review.title}`}
              className="flex flex-col rounded-card border border-ink-200 bg-white p-6"
            >
              <Rating rating={review.rating} />
              <h3 className="mt-4 font-semibold text-ink-950">{review.title}</h3>
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
    </section>
  );
}

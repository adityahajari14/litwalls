import { HeroCarousel, type HeroSlide } from "@/components/home/hero-carousel";
import { Container } from "@/components/ui/container";
import { Rating } from "@/components/ui/rating";
import { bundleFreeCount, SINGLE_BUNDLES } from "@/lib/offers";
import { ENTRY_PRICE, groupFromPrice, priceGroup } from "@/lib/pricing";
import type { Review } from "@/lib/reviews";

const starterBundle = SINGLE_BUNDLES[0];
const splitPosterFromPrice = groupFromPrice(priceGroup("split")!);
const customPosterFromPrice = groupFromPrice(priceGroup("poster")!);
const photoPrintFromPrice = Math.min(
  groupFromPrice(priceGroup("retro")!),
  groupFromPrice(priceGroup("mini")!),
);

const slides: HeroSlide[] = [
  {
    id: "posters",
    label: "Find your wall's personality",
    eyebrow: "A little art. A whole new room.",
    lines: ["Posters that", "make your"],
    accent: "walls talk.",
    description: `Your interests. Your aesthetic. Your kind of space. Bring it all home with 300gsm matte posters, from ₹${ENTRY_PRICE}.`,
    primary: { label: "Find your posters", href: "/products" },
    secondary: { label: "Explore collections", href: "/collections" },
    image: {
      src: "/brand/hero-posters-v5.webp",
      alt: "Anime, Cars and Music: Starry Night Cat, Haas F1 and Travis Scott posters in a sunlit listening corner",
    },
    mobile: {
      image: "/brand/hero-posters-mobile-v3.webp",
      lines: ["Make your"],
      description: `300gsm matte prints of everything you love. Find your favourites from ₹${ENTRY_PRICE}.`,
      note: "Made for your space.",
    },
    note: "Made for your space.",
  },
  {
    id: "bundles",
    label: "More posters, more savings",
    eyebrow: "Good things come in bundles",
    lines: [`Buy ${starterBundle.pay} posters.`],
    accent: `Get ${bundleFreeCount(starterBundle)} free.`,
    description: "One for your desk. A few for your walls. Mix your favourite designs and give every corner a little personality.",
    primary: { label: "Build your poster wall", href: "/products" },
    image: {
      src: "/brand/hero-bundle-studio.webp",
      alt: "",
    },
    mobile: {
      image: "/brand/hero-bundles-mobile.webp",
      lines: [`Buy ${starterBundle.pay} posters.`],
      description: "Mix your favourite designs. Build a poster wall that feels like you, for less.",
      note: `Add ${starterBundle.total} eligible posters. Savings apply automatically.`,
    },
    posterWall: [
      {
        src: "/brand/hero-products/haas-f1-team-01-f1-posters.webp",
        alt: "Haas F1 Team #01 — Cars and F1 poster",
        crop: { left: 305, top: 98, width: 416, height: 587, imageWidth: 1000, imageHeight: 1043 },
      },
      { src: "/brand/hero-products/starry-night-cat-01-anime-posters.webp", alt: "Starry Night Cat #01 — Anime poster" },
      { src: "/brand/hero-products/spider-man-14-marvel-posters.webp", alt: "Spider Man #14 poster" },
      { src: "/brand/hero-products/batman-05-dc-posters.webp", alt: "Batman #05 poster" },
      { src: "/brand/hero-products/travis-scott-03-music-posters-2.webp", alt: "Travis Scott #03 — Music poster" },
      { src: "/brand/hero-products/the-truman-show-01-movies-posters.webp", alt: "The Truman Show #01 — Movies poster" },
      { src: "/brand/hero-products/ford-v-ferrari-01-movies-posters.webp", alt: "Ford v Ferrari #01 — Cars and Movies poster" },
    ],
    note: `Add ${starterBundle.total} eligible single posters to your cart. Your bundle savings apply automatically.`,
  },
  {
    id: "photo-prints",
    label: "Retro prints and mini pocket prints",
    eyebrow: "Retro prints & mini pocket prints",
    lines: ["Small prints."],
    accent: "Big memories.",
    description: "Your favourite moments, made to hold. Turn your camera roll into retro prints for your room and mini pocket prints to take everywhere.",
    primary: { label: "Shop retro prints", href: "/custom/retro-prints" },
    secondary: { label: "Mini pocket prints", href: "/custom/mini-pocket-prints-pack-of-5" },
    showSecondaryOnMobile: true,
    image: {
      src: "/brand/hero-photo-prints.webp",
      alt: "White-bordered retro photo prints and smaller mini pocket prints on a walnut desk beside an analog camera and orange lamp",
      width: 1691,
      height: 930,
    },
    mobile: {
      image: "/brand/hero-photo-prints-mobile.webp",
      lines: ["Small prints."],
      description: "Retro prints for your space. Mini pocket prints to keep your favourite moments close.",
      note: `Sets of 5 or 10. From ₹${photoPrintFromPrice}. Upload your photos.`,
      primaryLabel: "Retro prints",
      secondaryLabel: "Pocket prints",
    },
    note: `Sets of 5 or 10, from ₹${photoPrintFromPrice}. Upload your photos and make them yours.`,
  },
  {
    id: "split-posters",
    label: "One design across three panels",
    eyebrow: "Split posters, bigger impact",
    lines: ["One design."],
    accent: "Three panels.",
    description: "A wider view of what you love. One artwork across three matte panels, made for the wall that needs a little more.",
    primary: { label: "Shop split posters", href: "/#split-posters" },
    secondary: { label: "Print your own split", href: "/custom/custom-split-poster" },
    image: {
      src: "/brand/hero-split-posters.webp",
      alt: "A blue McLaren Senna GTR catalogue design continuing across three unframed poster panels above a walnut sideboard",
    },
    mobile: {
      image: "/brand/hero-split-posters-mobile.webp",
      lines: ["One design."],
      description: "One artwork. Three matte panels. A bigger statement for your favourite wall.",
      note: `Split sets from ₹${splitPosterFromPrice}. Three panels. One artwork.`,
    },
    note: `Split sets from ₹${splitPosterFromPrice}. Printed on 300gsm matte paper.`,
  },
  {
    id: "custom-posters",
    label: "Create your own custom poster",
    eyebrow: "Your design. Our 300gsm matte paper.",
    lines: ["Your idea."],
    accent: "Your poster.",
    description: "Your photo, artwork or original design, printed big on 300gsm matte paper. Upload your image and make a poster that is yours.",
    primary: { label: "Create a custom poster", href: "/custom/custom-poster" },
    image: {
      src: "/brand/hero-custom-poster-design-v2.webp",
      alt: "A full-size white custom poster reading Your Design Here on a walnut desk beside an orange lamp and camera",
    },
    mobile: {
      image: "/brand/hero-custom-poster-design-mobile-v2.webp",
      lines: ["Your idea."],
      description: "Your photo or design, printed big on 300gsm matte paper. Make it yours.",
      note: `From ₹${customPosterFromPrice}. Upload your image and choose a size.`,
    },
    note: `From ₹${customPosterFromPrice}. Upload your image. Pick your size. We print it.`,
  },
];

export function Hero({
  reviews = [],
  summary,
}: {
  reviews?: Review[];
  summary?: { count: number; average: number };
}) {
  // Keep the proof tied to the same real reviews shown below the hero.
  const reviewCount = summary?.count ?? reviews.length;
  const averageRating =
    summary?.average ??
    (reviews.length
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0);

  return (
    <>
      <HeroCarousel slides={slides} />
      {reviewCount > 0 ? (
        <Container className="pb-4">
          <a
            href="#reviews"
            className="inline-flex flex-wrap items-center gap-3 rounded-card transition-opacity hover:opacity-80"
          >
            <Rating rating={averageRating} reviewCount={reviewCount} />
            <span className="text-xs text-ink-600 underline underline-offset-4">
              Read customer reviews
            </span>
          </a>
        </Container>
      ) : null}
    </>
  );
}

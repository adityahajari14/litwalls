export type PosterCrop = {
  left: number;
  top: number;
  width: number;
  height: number;
  imageWidth: number;
  imageHeight: number;
};

export type CollectionCover = {
  tagline: string;
  image?: string;
  layout?: "single";
  posters: { id: string; src: string; crop: PosterCrop; placeholderText?: string }[];
};

const DESK_POSTER: PosterCrop = { left: 343, top: 129, width: 296, height: 420, imageWidth: 1000, imageHeight: 1048 };
const WALL_POSTER: PosterCrop = { left: 305, top: 98, width: 416, height: 587, imageWidth: 1000, imageHeight: 1043 };

function poster(id: string, src: string, crop = DESK_POSTER) {
  return { id, src, crop };
}

/** Coordinated studio covers with catalogue artwork and warm, consistent lighting. */
export const COLLECTION_COVERS: Partial<Record<string, CollectionCover>> = {
  "marvel": {
    tagline: "Heroes worth hanging.",
    posters: [
      poster("captain-america-04-marvel-posters", "/collections/poster-art/captain-america-04-marvel-posters.webp"),
      poster("spider-man-14-marvel-posters", "/brand/hero-products/spider-man-14-marvel-posters.webp"),
      poster("iron-man-07-marvel-posters", "/collections/poster-art/iron-man-07-marvel-posters.webp"),
    ],
  },
  "movies-tv": {
    tagline: "Scenes worth keeping.",
    posters: [
      poster("oppenheimer-01-movies-posters", "/collections/poster-art/oppenheimer-01-movies-posters.webp"),
      poster("the-truman-show-01-movies-posters", "/brand/hero-products/the-truman-show-01-movies-posters.webp"),
      poster("breaking-bad-03-movies-posters", "/collections/poster-art/breaking-bad-03-movies-posters.webp"),
    ],
  },
  "music": {
    tagline: "For your kind of sound.",
    posters: [
      poster("the-weeknd-08-after-hours-music-posters", "/collections/poster-art/the-weeknd-08-after-hours-music-posters.webp"),
      poster("travis-scott-03-music-posters-2", "/brand/hero-products/travis-scott-03-music-posters-2.webp"),
      poster("eminem-04-music-posters", "/collections/poster-art/eminem-04-music-posters.webp"),
    ],
  },
  "dc": {
    tagline: "Iconic heroes. Your wall.",
    posters: [
      poster("superman-03-dc-posters", "/collections/poster-art/superman-03-dc-posters.webp"),
      poster("batman-05-dc-posters", "/brand/hero-products/batman-05-dc-posters.webp"),
      poster("the-flash-02-dc-posters-1", "/collections/poster-art/the-flash-02-dc-posters-1.webp"),
    ],
  },
  "cars": {
    tagline: "Build your dream garage.",
    posters: [
      poster("bmw-m4-03-cars-posters", "/collections/poster-art/bmw-m4-03-cars-posters.webp"),
      poster("ferrari-f40-03-cars-posters", "/collections/poster-art/ferrari-f40-03-cars-posters.webp"),
      poster("porsche-gt3-rs-03-cars-posters", "/collections/poster-art/porsche-gt3-rs-03-cars-posters.webp"),
    ],
  },
  "f1": {
    tagline: "Bring race day home.",
    posters: [
      poster("ferrari-sf25-01-f1-posters", "/collections/poster-art/ferrari-sf25-01-f1-posters.webp", WALL_POSTER),
      poster("haas-f1-team-01-f1-posters", "/brand/hero-products/haas-f1-team-01-f1-posters.webp", WALL_POSTER),
      poster("mclaren-f1-04-f1-posters", "/collections/poster-art/mclaren-f1-04-f1-posters.webp", WALL_POSTER),
    ],
  },
  "anime": {
    tagline: "Step into another world.",
    posters: [
      poster("spirited-away-01-anime-posters", "/brand/hero-products/spirited-away-01-anime-posters.webp"),
      poster("starry-night-cat-01-anime-posters", "/brand/hero-products/starry-night-cat-01-anime-posters.webp"),
      poster("my-neighbor-totoro-03-anime-posters", "/collections/poster-art/my-neighbor-totoro-03-anime-posters.webp"),
    ],
  },
  "aesthetic": {
    tagline: "A little calm. A lot of character.",
    image: "/collections/covers/aesthetic-v2.webp",
    posters: [],
  },
  "video-games": {
    tagline: "Your favourite worlds, off screen.",
    image: "/collections/covers/video-games-v2.webp",
    posters: [],
  },
  "motivational": {
    tagline: "A daily dose of inspiration.",
    image: "/collections/covers/motivational-v2.webp",
    posters: [],
  },
  "harry-potter": {
    tagline: "A little magic for your wall.",
    posters: [
      poster("harry-potter-05-left-panel", "/collections/poster-art/harry-potter-05-harry-potter-posters.webp", {
        left: 139, top: 76, width: 238, height: 336, imageWidth: 1000, imageHeight: 1048,
      }),
      poster("harry-potter-05-centre-panel", "/collections/poster-art/harry-potter-05-harry-potter-posters.webp", {
        left: 378, top: 76, width: 239, height: 336, imageWidth: 1000, imageHeight: 1048,
      }),
      poster("harry-potter-05-right-panel", "/collections/poster-art/harry-potter-05-harry-potter-posters.webp", {
        left: 619, top: 76, width: 238, height: 336, imageWidth: 1000, imageHeight: 1048,
      }),
    ],
  },
  "custom-prints": {
    tagline: "Your moments, in print.",
    posters: [0, 1, 2].map((index) => ({
      ...poster(
        ["coastal-photo-example", "custom-design-placeholder", "cat-photo-example"][index],
        "/collections/covers/custom-examples-v2.webp",
        { left: 89 + index * 600, top: 0, width: 423, height: 600, imageWidth: 1800, imageHeight: 600 },
      ),
      ...(index === 1 ? { placeholderText: "Your Design Here" } : {}),
    })),
  },
};

/** Keep customer uploads last, including when a featured collection is configured. */
export function orderCollectionCards<T extends { handle: string }>(collections: readonly T[], featuredHandle?: string): T[] {
  const standard = collections.filter((collection) => collection.handle !== "custom-prints");
  const custom = collections.filter((collection) => collection.handle === "custom-prints");
  const featured = standard.find((collection) => collection.handle === featuredHandle);
  return [
    ...(featured ? [featured, ...standard.filter((collection) => collection !== featured)] : standard),
    ...custom,
  ];
}

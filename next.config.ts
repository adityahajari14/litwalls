import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.shopify.com",
        pathname: "/s/files/**",
      },
      // Customer review photos from Judge.me, which serves them through imgix.
      // `pub-images.judge.me` is the vanity host on the same bucket; both are
      // allowed so a change on their side doesn't silently blank the photos.
      {
        protocol: "https",
        hostname: "judgeme-public-images.imgix.net",
      },
      {
        protocol: "https",
        hostname: "pub-images.judge.me",
      },
    ],
  },
};

export default nextConfig;

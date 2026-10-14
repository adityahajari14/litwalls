/**
 * Re-encodes the animated header logo for the size it is actually displayed at.
 *
 * The source is 1123×387 across 143 frames — around 2.6 MB, served raw on every
 * page because `next/image` cannot optimise an animated file. The header renders
 * it at `h-8` / `lg:h-10`, so it is never wider than about 116 CSS px; every
 * pixel past ~240px (2× DPR) is thrown away by the browser before it is drawn.
 *
 * Two levers, in the order they matter:
 *
 *   1. Resolution. Scaling 1123px down to 240px removes ~95% of the pixels.
 *   2. Frame count. `keepEvery` drops frames and hands their delay to the frame
 *      that survives, so the loop still runs the same wall-clock length — a
 *      6.8s animation stays 6.8s, it just holds each frame twice as long.
 *
 * Run it whenever the source animation changes:
 *
 *   node scripts/optimize-logo.js <src> <out> [width] [keepEvery] [quality] [alphaQuality]
 *
 * Alpha is preserved deliberately: the header is translucent (`bg-paper/85`
 * over blurred page content), so a logo flattened onto a solid ground would
 * show as a visible rectangle as content scrolls beneath it.
 */
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const [src, out] = process.argv.slice(2);
const WIDTH = Number(process.argv[4] || 240);
const KEEP_EVERY = Number(process.argv[5] || 2);
const QUALITY = Number(process.argv[6] || 65);
const ALPHA_QUALITY = Number(process.argv[7] || 80);

if (!src || !out) {
  console.error(
    "usage: node scripts/optimize-logo.js <src> <out> [width] [keepEvery] [quality] [alphaQuality]",
  );
  process.exit(1);
}

async function main() {
  const meta = await sharp(src, { animated: true }).metadata();
  const { pageHeight, pages, delay } = meta;

  // Resize the whole animated strip in one streaming pass. Slicing frames out
  // of the full-size source instead would decode a 62-megapixel image per
  // frame and spill gigabytes through libvips' temp directory.
  const frameHeight = Math.round(pageHeight * (WIDTH / meta.width));
  const { data } = await sharp(src, { animated: true })
    .resize({ width: WIDTH })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const bytesPerFrame = WIDTH * frameHeight * 4;

  // Keep every Nth frame, and give it the delay of the frames it replaces.
  const kept = [];
  const delays = [];
  for (let i = 0; i < pages; i += KEEP_EVERY) {
    let ms = 0;
    for (let j = i; j < Math.min(i + KEEP_EVERY, pages); j++) ms += delay[j];
    kept.push(data.subarray(i * bytesPerFrame, (i + 1) * bytesPerFrame));
    delays.push(ms);
  }

  // `pageHeight` belongs to the raw INPUT descriptor, not the webp output
  // options — it is what tells sharp the tall strip is a stack of frames
  // rather than one very long image. Without it the encoder happily writes a
  // 240×5976 still and the animation is silently lost.
  await sharp(Buffer.concat(kept), {
    raw: {
      width: WIDTH,
      height: frameHeight * kept.length,
      channels: 4,
      pageHeight: frameHeight,
    },
  })
    .webp({
      quality: QUALITY,
      alphaQuality: ALPHA_QUALITY,
      effort: 6,
      loop: 0,
      delay: delays,
    })
    .toFile(out);

  const check = await sharp(out, { animated: true }).metadata();
  if (check.pages !== kept.length) {
    throw new Error(
      `Encoded ${check.pages ?? 1} frame(s), expected ${kept.length} — the output is not animated.`,
    );
  }

  const before = fs.statSync(src).size;
  const after = fs.statSync(out).size;
  console.log(
    `${path.basename(out)}  ${WIDTH}×${frameHeight}  ${kept.length}/${pages} frames  ` +
      `q${QUALITY}/a${ALPHA_QUALITY}  →  ${(after / 1024).toFixed(1)} KB ` +
      `(from ${(before / 1024).toFixed(1)} KB, ${(before / after).toFixed(1)}× smaller, ` +
      `loop ${(delays.reduce((a, b) => a + b, 0) / 1000).toFixed(2)}s)`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

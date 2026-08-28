/**
 * Rules for customer-supplied poster artwork.
 *
 * Shared by the browser (to reject a bad file before it wastes an upload) and
 * the server (which cannot trust the browser). Neither side may relax these on
 * its own — a file that passes here is one we have committed to printing.
 */

/** Line-item attribute keys. These appear verbatim on the Shopify order. */
export const CUSTOM_ART_ATTRIBUTE = "Artwork";
export const CUSTOM_NOTE_ATTRIBUTE = "Note";

export const ACCEPTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

/** Generous enough for a phone photo at full resolution; short of absurd. */
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

/**
 * Print sizes, with the pixel dimensions needed to hit a decent print density.
 *
 * Derived at ~250dpi, which is the honest floor for a poster viewed from a
 * couple of feet away. Below this the print is visibly soft, and a customer who
 * is disappointed by their own file still blames us — so we say no up front
 * rather than take the money.
 */
export const PRINT_SIZES = [
  { id: "A5", label: "A5", mm: "148 × 210 mm", minWidth: 1748, minHeight: 2480 },
  { id: "A4", label: "A4", mm: "210 × 297 mm", minWidth: 2480, minHeight: 3508 },
  { id: "A3", label: "A3", mm: "297 × 420 mm", minWidth: 3508, minHeight: 4961 },
  // Not part of the litwalls-studio drift check (check-drift.mjs only
  // compares A5/A4/A3) — this is the same "Super B" size Studio already
  // offers under its own name for the AI-poster catalogue.
  { id: "13x19", label: '13" × 19"', mm: "330 × 483 mm", minWidth: 3250, minHeight: 4750 },
] as const;

export type PrintSizeId = (typeof PRINT_SIZES)[number]["id"];

export function printSize(id: string) {
  return PRINT_SIZES.find((size) => size.id === id) ?? null;
}

export function isAcceptedMimeType(type: string) {
  return (ACCEPTED_MIME_TYPES as readonly string[]).includes(type);
}

export function formatBytes(bytes: number) {
  const mb = bytes / (1024 * 1024);
  return mb >= 10 ? `${Math.round(mb)}MB` : `${mb.toFixed(1)}MB`;
}

export type FileProblem = { message: string };

/** Cheap checks that need only the file's metadata — no decoding. */
export function checkFile(file: {
  type: string;
  size: number;
}): FileProblem | null {
  if (!isAcceptedMimeType(file.type)) {
    return { message: "That file type isn't supported. Use a JPG, PNG or WebP." };
  }
  if (file.size > MAX_FILE_BYTES) {
    return {
      message: `That file is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_FILE_BYTES)}.`,
    };
  }
  if (file.size === 0) {
    return { message: "That file is empty." };
  }
  return null;
}

/**
 * Whether the image has the pixels to print at `size`.
 *
 * Orientation-agnostic: a landscape poster is the same file rotated, so we
 * compare the image's long edge to the size's long edge. Rejecting a perfectly
 * good landscape photo for being "too short" would be a bug the customer
 * experiences as us being broken.
 */
export function resolutionFor(
  size: { minWidth: number; minHeight: number },
  image: { width: number; height: number },
) {
  const imageLong = Math.max(image.width, image.height);
  const imageShort = Math.min(image.width, image.height);
  const needLong = Math.max(size.minWidth, size.minHeight);
  const needShort = Math.min(size.minWidth, size.minHeight);

  return {
    ok: imageLong >= needLong && imageShort >= needShort,
    needLong,
    needShort,
  };
}

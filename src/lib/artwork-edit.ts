/**
 * The customer's edit to their artwork — rotate, zoom, reposition — and the
 * arithmetic that turns it into pixels.
 *
 * One model drives both things that have to agree: the on-screen preview and
 * the file that is finally uploaded. They draw through the same function with
 * a different output size, so what the customer framed is what gets printed.
 * A preview done in CSS and an export done on a canvas would be two
 * implementations of the same crop, free to drift apart.
 */

export type ArtworkEdit = {
  /** Clockwise quarter turns. */
  rotation: 0 | 90 | 180 | 270;
  /** 1 fills the print exactly; higher crops in. */
  zoom: number;
  /**
   * Where the crop sits within the slack left over after zooming, 0–1 on each
   * axis. 0.5 is centred. Stored as a fraction rather than pixels so the crop
   * stays put when the customer picks a size with a slightly different shape.
   */
  x: number;
  y: number;
};

export const DEFAULT_EDIT: ArtworkEdit = { rotation: 0, zoom: 1, x: 0.5, y: 0.5 };

/** Past 4× almost any upload is too few pixels to print at any size offered. */
export const MAX_ZOOM = 4;

export function isDefaultEdit(edit: ArtworkEdit): boolean {
  return (
    edit.rotation === 0 && edit.zoom === 1 && edit.x === 0.5 && edit.y === 0.5
  );
}

export type Size = { width: number; height: number };

/** The image's dimensions once the rotation is applied. */
export function rotatedSize(image: Size, rotation: ArtworkEdit["rotation"]): Size {
  return rotation % 180 === 0
    ? image
    : { width: image.height, height: image.width };
}

export type CropRect = { x: number; y: number; width: number; height: number };

/**
 * The part of the (rotated) image that will be printed, in image pixels.
 *
 * `ratio` is the print's width ÷ height. At zoom 1 the crop is the largest
 * rectangle of that shape the image can hold; zooming shrinks it from there.
 */
export function cropRect(image: Size, edit: ArtworkEdit, ratio: number): CropRect {
  const rotated = rotatedSize(image, edit.rotation);
  const zoom = Math.min(MAX_ZOOM, Math.max(1, edit.zoom));

  const width = Math.min(rotated.width, rotated.height * ratio) / zoom;
  const height = width / ratio;

  return {
    x: clamp01(edit.x) * (rotated.width - width),
    y: clamp01(edit.y) * (rotated.height - height),
    width,
    height,
  };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * The edit after dragging the image by (dx, dy), given in crop-rect pixels.
 *
 * Dragging right moves the image right, which moves the crop window left —
 * hence the subtraction.
 */
export function panned(
  image: Size,
  edit: ArtworkEdit,
  ratio: number,
  dx: number,
  dy: number,
): ArtworkEdit {
  const rotated = rotatedSize(image, edit.rotation);
  const crop = cropRect(image, edit, ratio);

  const slackX = rotated.width - crop.width;
  const slackY = rotated.height - crop.height;

  return {
    ...edit,
    // No slack means nothing to slide along that axis; the fraction is left
    // alone so it is still meaningful if a later zoom creates some.
    x: slackX > 0.5 ? clamp01((crop.x - dx) / slackX) : edit.x,
    y: slackY > 0.5 ? clamp01((crop.y - dy) / slackY) : edit.y,
  };
}

/**
 * Draws the cropped, rotated image to fill a canvas of `out` pixels.
 *
 * `source` may be a scaled-down copy of the image (the preview uses one so
 * dragging stays smooth); `image` is the size the edit is expressed in, and
 * the two are reconciled here.
 */
export function drawEdit(
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  image: Size,
  edit: ArtworkEdit,
  ratio: number,
  out: Size,
): void {
  const rotated = rotatedSize(image, edit.rotation);
  const crop = cropRect(image, edit, ratio);
  const scale = out.width / crop.width;

  context.save();
  context.setTransform(1, 0, 0, 1, 0, 0);

  // White, not transparent: the export is a JPEG, where transparency would
  // come out black, and paper is white anyway.
  context.fillStyle = "#fff";
  context.fillRect(0, 0, out.width, out.height);

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  context.scale(scale, scale);
  context.translate(-crop.x, -crop.y);
  // Turned about the centre of the rotated frame, so the image lands exactly
  // on it whichever way round it is.
  context.translate(rotated.width / 2, rotated.height / 2);
  context.rotate((edit.rotation * Math.PI) / 180);
  context.drawImage(
    source,
    -image.width / 2,
    -image.height / 2,
    image.width,
    image.height,
  );

  context.restore();
}

/**
 * Pixel budgets for an exported file, tried in order.
 *
 * The first is simply "all of it": a split set across three A3 panels is a
 * 37MP crop, and shrinking that to suit the weakest browser would cost every
 * customer print quality to protect a few. Shopify itself is not the limit —
 * a 26MP file was accepted and served at full size when this was written.
 *
 * The second exists for iOS Safari, which has refused canvases larger than
 * 16,777,216 pixels and fails by producing a blank one, with no error. When
 * the full-size attempt comes back empty, this one fits.
 */
const EXPORT_BUDGETS = [48_000_000, 16_000_000];

/** The pixel size to export a crop at: its native size, within `budget`. */
export function exportSize(crop: CropRect, budget = EXPORT_BUDGETS[0]): Size {
  const area = crop.width * crop.height;
  const shrink = area > budget ? Math.sqrt(budget / area) : 1;

  return {
    width: Math.max(1, Math.round(crop.width * shrink)),
    height: Math.max(1, Math.round(crop.height * shrink)),
  };
}

/**
 * Renders the edit to a JPEG. Null when the browser could not do it at any
 * budget — so the caller can fall back rather than upload a blank poster.
 */
export async function exportEdit(
  source: CanvasImageSource,
  image: Size,
  edit: ArtworkEdit,
  ratio: number,
): Promise<{ blob: Blob; size: Size } | null> {
  const crop = cropRect(image, edit, ratio);
  let previous: Size | null = null;

  for (const budget of EXPORT_BUDGETS) {
    const size = exportSize(crop, budget);
    // A crop already under the smaller budget would just fail the same way twice.
    if (previous && previous.width === size.width) break;
    previous = size;

    const result = await renderEdit(source, image, edit, ratio, size);
    if (result) return result;
  }

  return null;
}

async function renderEdit(
  source: CanvasImageSource,
  image: Size,
  edit: ArtworkEdit,
  ratio: number,
  size: Size,
): Promise<{ blob: Blob; size: Size } | null> {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;

    const context = canvas.getContext("2d");
    if (!context) return null;

    drawEdit(context, source, image, edit, ratio, size);

    // A blank canvas is the failure mode described above. One corner pixel
    // with zero alpha proves nothing was drawn — drawEdit always fills white.
    if (context.getImageData(0, 0, 1, 1).data[3] === 0) return null;

    const blob = await new Promise<Blob | null>((resolve) =>
      // 0.95: visually lossless for print, a fraction of a PNG's size.
      canvas.toBlob(resolve, "image/jpeg", 0.95),
    );

    // Release the backing store now rather than at the next GC; a 16MP
    // canvas is ~64MB of memory, which a phone notices.
    canvas.width = 0;
    canvas.height = 0;

    return blob && blob.size > 0 ? { blob, size } : null;
  } catch {
    return null;
  }
}

/** A plain-words description of the edit, for fulfilment to apply by hand. */
export function describeEdit(image: Size, edit: ArtworkEdit, ratio: number): string {
  const rotated = rotatedSize(image, edit.rotation);
  const crop = cropRect(image, edit, ratio);
  const percent = (value: number, of: number) => `${Math.round((value / of) * 100)}%`;

  return [
    edit.rotation ? `rotate ${edit.rotation}° clockwise, then` : null,
    `crop from left ${percent(crop.x, rotated.width)}, top ${percent(crop.y, rotated.height)},`,
    `width ${percent(crop.width, rotated.width)}, height ${percent(crop.height, rotated.height)}`,
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * The edit at a new zoom level, keeping whatever is at the centre of the frame
 * at the centre. Zooming about a corner instead makes the subject slide away
 * as you zoom in on it.
 */
export function zoomed(
  image: Size,
  edit: ArtworkEdit,
  ratio: number,
  zoom: number,
): ArtworkEdit {
  const rotated = rotatedSize(image, edit.rotation);
  const before = cropRect(image, edit, ratio);
  const centreX = before.x + before.width / 2;
  const centreY = before.y + before.height / 2;

  const next = { ...edit, zoom: Math.min(MAX_ZOOM, Math.max(1, zoom)) };
  const after = cropRect(image, next, ratio);

  const slackX = rotated.width - after.width;
  const slackY = rotated.height - after.height;

  return {
    ...next,
    x: slackX > 0.5 ? clamp01((centreX - after.width / 2) / slackX) : 0.5,
    y: slackY > 0.5 ? clamp01((centreY - after.height / 2) / slackY) : 0.5,
  };
}

/** A quarter turn clockwise. Re-centred: the old position means nothing sideways. */
export function turned(edit: ArtworkEdit): ArtworkEdit {
  return {
    ...edit,
    rotation: ((edit.rotation + 90) % 360) as ArtworkEdit["rotation"],
    x: 0.5,
    y: 0.5,
  };
}

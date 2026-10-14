"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useCart } from "@/components/cart/cart-provider";
import {
  ArtworkCanvas,
  ArtworkToolbar,
} from "@/components/custom/artwork-editor";
import {
  CheckIcon,
  CloseIcon,
  CropIcon,
  UploadIcon,
} from "@/components/icons";
import { BuyReassurance } from "@/components/product/buy-reassurance";
import { QuantityStepper } from "@/components/product/quantity-stepper";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/ui/price";
import {
  cropRect,
  DEFAULT_EDIT,
  describeEdit,
  exportEdit,
  isDefaultEdit,
  type ArtworkEdit,
} from "@/lib/artwork-edit";
import { startCheckout } from "@/lib/checkout/start-checkout";
import {
  ACCEPTED_MIME_TYPES,
  checkFile,
  formatBytes,
  MAX_FILE_BYTES,
  MAX_UPLOAD_BYTES,
  resolutionFor,
} from "@/lib/custom-poster";
import {
  printAspectFor,
  resolutionRequirementFor,
  selectionsComplete,
  type CustomProductConfig,
} from "@/lib/custom-products";
import {
  addCustomUpload,
  createArtworkUpload,
  registerArtwork,
} from "@/lib/shopify/actions";
import type { StagedTarget } from "@/lib/shopify/admin";
import { variantForOptions, type Product } from "@/lib/shopify/types";
import { cn } from "@/lib/cn";

type Picked = {
  file: File;
  /** Object URL the image was decoded from. Revoked on replace — these leak otherwise. */
  previewUrl: string;
  /** The decoded image: what the preview and the final export both draw from. */
  image: HTMLImageElement;
  width: number;
  height: number;
};

type Phase = "idle" | "preparing" | "uploading" | "adding";

/** How many times to ask Shopify whether it has finished processing a file. */
const PROCESSING_ATTEMPTS = 10;

/**
 * Reads the image's true pixel dimensions by decoding it in the browser.
 *
 * This is the only way to know whether a file can actually print at the
 * chosen size — the file's byte size says nothing about it. A 200KB
 * vector-flat PNG can be huge in pixels; a 12MB phone photo can be a 1000px
 * screenshot someone upscaled.
 */
function readImage(file: File) {
  return new Promise<{
    url: string;
    image: HTMLImageElement;
    width: number;
    height: number;
  } | null>((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();

    img.onload = () =>
      resolve({
        url,
        image: img,
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };

    img.src = url;
  });
}

/** "My Photo (2).png" → "my-photo-2-print.jpg": a name safe in a URL. */
function printFileName(original: string): string {
  const stem =
    original
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "artwork";

  return `${stem}-print.jpg`;
}

/**
 * Uploads straight to Shopify's storage using the pre-signed target.
 *
 * The signed parameters must be appended *before* the file — S3-style
 * pre-signed POSTs ignore any field that follows the file part, so putting the
 * file first silently strips the auth and the upload 403s.
 */
async function uploadToShopify(target: StagedTarget, file: File) {
  const form = new FormData();
  for (const { name, value } of target.parameters) {
    form.append(name, value);
  }
  form.append("file", file);

  const response = await fetch(target.url, { method: "POST", body: form });

  if (!response.ok) {
    throw new Error(`Upload failed with ${response.status}`);
  }
}

/**
 * The upload page for one custom-print product. Renders one button group per
 * Shopify option (Size, and — for Retro Prints and Mini Pocket Prints —
 * Quantity too), resolves the real variant those selections point to via
 * `variantForOptions`, and shows and charges that variant's actual price.
 *
 * This replaces a version that only ever tracked a free-text size label and
 * always added the product's cheapest variant regardless of what was picked
 * — see the comment on `addCustomUpload`.
 */
export function CustomUploadForm({
  product,
  config,
}: {
  product: Product;
  config: CustomProductConfig;
}) {
  const [picked, setPicked] = useState<Picked | null>(null);
  // How the customer has framed their image, and whether they are framing it
  // right now. See ArtworkCanvas for why dragging needs an explicit mode.
  const [edit, setEdit] = useState<ArtworkEdit>(DEFAULT_EDIT);
  const [editing, setEditing] = useState(false);
  // The last artwork saved to Shopify, and what it was made from. A retry
  // after a slow processing step — or a second "Add to cart" of the very same
  // framing — reuses it instead of sending 20MB up the line again.
  const saved = useRef<{ signature: string; fileId: string; crop?: string } | null>(
    null,
  );
  const [selections, setSelections] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      config.axes.map((axis) => [axis.name, axis.values[0]?.value ?? ""]),
    ),
  );
  const [note, setNote] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [phase, setPhase] = useState<Phase>("idle");
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const { refresh, open } = useCart();
  const router = useRouter();

  // Drives the sticky mobile bar the same way the regular product page does:
  // it appears only once the real buttons scroll away, so the two are never
  // both on screen fighting for attention.
  const [showSticky, setShowSticky] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = actionsRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => setShowSticky(!entry.isIntersecting),
      { rootMargin: "-72px 0px 0px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // The preview is an object URL; without this it stays allocated for the life
  // of the page every time the customer swaps their image.
  useEffect(() => {
    return () => {
      if (picked) URL.revokeObjectURL(picked.previewUrl);
    };
  }, [picked]);

  async function pick(file: File | undefined) {
    if (!file) return;
    setError(null);

    const problem = checkFile(file);
    if (problem) {
      setError(problem.message);
      return;
    }

    const image = await readImage(file);
    if (!image) {
      setError("We couldn't read that image. Try a different file.");
      return;
    }

    setPicked((previous) => {
      if (previous) URL.revokeObjectURL(previous.previewUrl);
      return {
        file,
        previewUrl: image.url,
        image: image.image,
        width: image.width,
        height: image.height,
      };
    });
    // A framing belongs to the image it was made on.
    setEdit(DEFAULT_EDIT);
    setEditing(false);
  }

  function clear() {
    setPicked((previous) => {
      if (previous) URL.revokeObjectURL(previous.previewUrl);
      return null;
    });
    setEdit(DEFAULT_EDIT);
    setEditing(false);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const variant = variantForOptions(product, selections);
  const displayPrice = variant?.price ?? product.priceRange.minVariantPrice;
  const requirement = resolutionRequirementFor(config, selections);

  // The frame the print will actually be, so the preview shows the real crop
  // instead of a fixed 4:5 box. A5-A3 are all ~1:1.414 portrait; a split set is
  // a wide landscape strip. Someone uploading a square phone photo for an A3
  // could not previously see that the top and bottom were about to be cut off,
  // and found out when the tube arrived.
  const printAspect = printAspectFor(config, selections);
  const printRatio = printAspect ? printAspect.width / printAspect.height : 4 / 5;

  // The part of the image that will be printed. Everything about print quality
  // is judged on THIS, not on the file: zooming in to a face on a 12MP photo
  // leaves perhaps 2MP on the paper, and it is those 2MP that have to be sharp.
  const crop = picked ? cropRect(picked, edit, printRatio) : null;
  const printed = crop
    ? { width: Math.round(crop.width), height: Math.round(crop.height) }
    : null;
  const resolution =
    printed && requirement ? resolutionFor(requirement, printed) : null;

  // How much of the image falls outside the print. Below a few percent the
  // difference is a sliver of margin nobody would call a crop, so the warning
  // stays quiet rather than crying wolf on every upload.
  const cropLoss =
    picked && crop
      ? 1 - (crop.width * crop.height) / (picked.width * picked.height)
      : 0;
  const cropsNoticeably = cropLoss > 0.06;
  const adjusted = !isDefaultEdit(edit);
  const busy = phase !== "idle";
  const ready = picked && variant && selectionsComplete(config, selections);

  /**
   * The file to send, with the customer's framing baked in.
   *
   * An image that already fits, and that nobody has touched, goes up exactly
   * as it was picked — re-encoding it would only cost quality. Anything else is
   * redrawn to the crop, so the printer receives precisely what the preview
   * showed and has no framing decision left to make.
   *
   * If the browser cannot do that (see exportEdit), the original goes up
   * instead with the crop written out in words. Slower for whoever prints it;
   * infinitely better than a blank poster.
   */
  async function prepareUpload(
    image: Picked,
  ): Promise<{ file: File; crop?: string } | { error: string }> {
    const asPicked = !adjusted && !cropsNoticeably;
    const originalFits = image.file.size <= MAX_UPLOAD_BYTES;

    if (asPicked && originalFits) return { file: image.file };

    const exported = await exportEdit(image.image, image, edit, printRatio);

    if (exported && exported.blob.size <= MAX_UPLOAD_BYTES) {
      return {
        file: new File([exported.blob], printFileName(image.file.name), {
          type: "image/jpeg",
        }),
      };
    }

    if (originalFits) {
      return {
        file: image.file,
        crop: asPicked ? undefined : describeEdit(image, edit, printRatio),
      };
    }

    return {
      error: `That file is ${formatBytes(image.file.size)}, over the ${formatBytes(MAX_UPLOAD_BYTES)} we can accept, and this browser couldn't shrink it. Try a smaller copy.`,
    };
  }

  /**
   * Gets the artwork into Shopify as a permanent file and returns its id —
   * or reuses the one from a moment ago if nothing about it has changed.
   */
  async function saveArtwork(
    image: Picked,
  ): Promise<{ fileId: string; crop?: string } | { error: string }> {
    const signature = [
      image.file.name,
      image.file.size,
      image.file.lastModified,
      JSON.stringify(edit),
      printRatio,
    ].join("|");

    if (saved.current?.signature === signature) return saved.current;

    setPhase("preparing");
    const upload = await prepareUpload(image);
    if ("error" in upload) return upload;

    setPhase("uploading");
    const staged = await createArtworkUpload({
      name: upload.file.name,
      type: upload.file.type,
      size: upload.file.size,
    });
    if (!staged.ok) return { error: staged.message };

    await uploadToShopify(staged.target, upload.file);

    const registered = await registerArtwork(staged.target.resourceUrl);
    if (!registered.ok) return { error: registered.message };

    saved.current = { signature, fileId: registered.fileId, crop: upload.crop };
    return saved.current;
  }

  /**
   * Unlike a catalogue product, there is no cart line to add to until the
   * artwork has actually finished uploading — so "Buy now" here means upload
   * first, then go straight to checkout, rather than the one-step addItem
   * the regular AddToCart button gets to do.
   */
  async function submit(then: "drawer" | "checkout") {
    if (!picked || !variant) return;

    setError(null);
    setEditing(false);
    if (then === "checkout") setBuying(true);

    const fail = (message: string) => {
      setError(message);
      setPhase("idle");
      setBuying(false);
    };

    try {
      const artwork = await saveArtwork(picked);
      if ("error" in artwork) return fail(artwork.error);

      setPhase("adding");

      // Shopify processes a new file in the background and the server only
      // waits a few seconds per call, so a large upload takes a few asks.
      let result = await addCustomUpload({
        fileId: artwork.fileId,
        crop: artwork.crop,
        variantId: variant.id,
        note,
        quantity,
      });

      for (
        let attempt = 1;
        !result.ok && "processing" in result && attempt < PROCESSING_ATTEMPTS;
        attempt++
      ) {
        result = await addCustomUpload({
          fileId: artwork.fileId,
          crop: artwork.crop,
          variantId: variant.id,
          note,
          quantity,
        });
      }

      if (!result.ok) return fail(result.message);

      const cart = await refresh();

      if (then === "checkout") {
        if (cart?.checkoutUrl) {
          // Fastrr or Shopify — startCheckout owns that decision.
          const outcome = await startCheckout(cart);
          if (outcome.via === "fastrr") {
            // The overlay opens over this page, and the poster is already in
            // the cart. Left as it was, a shopper who closed the overlay and
            // tapped "Buy now" again would add the same print a second time.
            router.refresh();
            clear();
            setBuying(false);
            setPhase("idle");
          }
          return;
        }
        setError("Could not start checkout. Please try again.");
        setPhase("idle");
        setBuying(false);
        return;
      }

      router.refresh();
      clear();
      setPhase("idle");
      open();
    } catch (uploadError) {
      console.error(uploadError);
      setError("The upload didn't finish. Check your connection and try again.");
      setPhase("idle");
      setBuying(false);
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
        {/* Same frame the real product gallery uses (aspect-4/5, rounded-card,
            ink-100 fill) so the two pages read as one design, not two. */}
        <div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_MIME_TYPES.join(",")}
            className="sr-only"
            onChange={(event) => pick(event.target.files?.[0])}
          />

          {picked ? (
            <div className="flex flex-col gap-4">
              <div
                className="relative overflow-hidden rounded-card bg-ink-100 ring-1 ring-ink-950/5"
                style={{ aspectRatio: `${printRatio}` }}
              >
                <ArtworkCanvas
                  image={picked.image}
                  size={picked}
                  edit={edit}
                  setEdit={setEdit}
                  ratio={printRatio}
                  editing={editing && !busy}
                />

                {/* Where a split set divides. This is a decision customers want
                    to make deliberately - a face landing on a gutter is the
                    most common regret on a three-panel print. */}
                {config.splitPanels && config.splitPanels > 1 ? (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 flex"
                  >
                    {Array.from({ length: config.splitPanels }, (_, index) => (
                      <div
                        key={index}
                        className={
                          index === 0
                            ? "flex-1"
                            : "flex-1 border-l-2 border-white/70"
                        }
                      />
                    ))}
                  </div>
                ) : null}

                {editing ? (
                  <p className="pointer-events-none absolute inset-x-0 top-3 mx-auto w-fit rounded-full bg-ink-950/70 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur">
                    Drag to reposition
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={clear}
                    disabled={busy}
                    aria-label="Remove image"
                    className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-ink-950/70 text-white backdrop-blur transition-colors hover:bg-ink-950 disabled:opacity-50"
                  >
                    <CloseIcon className="size-4" />
                  </button>
                )}
              </div>

              {editing && !busy ? (
                <ArtworkToolbar
                  size={picked}
                  edit={edit}
                  setEdit={setEdit}
                  ratio={printRatio}
                  onDone={() => setEditing(false)}
                />
              ) : (
                <div className="flex items-center justify-between gap-3 rounded-card border border-ink-200 bg-white py-2 pr-2 pl-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-ink-600">
                      {picked.file.name}
                    </p>
                    {printed ? (
                      <p className="text-xs text-ink-500">
                        Prints from {printed.width} × {printed.height} px
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    disabled={busy}
                    className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-ink-200 px-4 text-sm font-medium text-ink-800 transition-colors hover:border-ink-950 disabled:opacity-50"
                  >
                    <CropIcon className="size-4" />
                    Adjust
                  </button>
                </div>
              )}

              {adjusted ? (
                <p className="flex items-start gap-2 text-sm text-ink-600 text-pretty">
                  <CheckIcon className="mt-0.5 size-4 shrink-0 text-success" />
                  This is exactly what we&apos;ll print — the frame above is
                  the edge of the {config.splitPanels ? "set" : "paper"}.
                </p>
              ) : cropsNoticeably ? (
                <p className="flex items-start gap-2 rounded-card bg-brand-50 px-4 py-3 text-sm text-ink-700 text-pretty">
                  <CropIcon className="mt-0.5 size-4 shrink-0 text-brand-600" />
                  <span>
                    This is the crop — about{" "}
                    <span className="font-semibold text-ink-950">
                      {Math.round(cropLoss * 100)}%
                    </span>{" "}
                    of your image falls outside{" "}
                    {config.splitPanels ? "the panels" : "the print"}. Tap{" "}
                    <span className="font-semibold text-ink-950">Adjust</span>{" "}
                    to move, zoom or rotate it and choose exactly what stays.
                  </span>
                </p>
              ) : (
                <p className="flex items-start gap-2 text-sm text-ink-600 text-pretty">
                  <CheckIcon className="mt-0.5 size-4 shrink-0 text-success" />
                  Your image fits this size almost exactly — nothing meaningful
                  gets cropped.
                </p>
              )}

              {config.splitPanels && config.splitPanels > 1 ? (
                <p className="text-xs text-ink-500 text-pretty">
                  The white lines show where the {config.splitPanels} panels
                  divide. Check nothing important lands on a join.
                </p>
              ) : null}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                pick(event.dataTransfer.files?.[0]);
              }}
              className={cn(
                "flex aspect-4/5 w-full flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed px-6 text-center transition-colors",
                dragging
                  ? "border-brand-400 bg-brand-50"
                  : "border-ink-200 bg-ink-100 hover:border-brand-400 hover:bg-brand-50/40",
              )}
            >
              <div className="grid size-12 place-items-center rounded-full bg-white text-brand-600 shadow-card">
                <UploadIcon className="size-6" />
              </div>
              <p className="font-medium text-ink-900">
                Drop your image, or tap to browse
              </p>
              <p className="text-sm text-ink-500 text-pretty">
                JPG, PNG or WebP, up to {formatBytes(MAX_FILE_BYTES)}
              </p>
            </button>
          )}
        </div>

        <div className="lg:py-4">
          <p className="text-xs font-semibold tracking-[0.18em] text-ink-500 uppercase">
            Custom
          </p>

          <h1 className="mt-3 font-display text-4xl text-ink-950 sm:text-5xl">
            {config.label}
          </h1>
          <p className="mt-2 text-ink-600">{config.tagline}</p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Price price={displayPrice} showDiscount={false} className="text-xl" />
          </div>
          <p className="mt-1 text-sm text-ink-500">
            Inclusive of all taxes. Shipping calculated at checkout.
          </p>

          {config.axes.map((axis) => (
            <fieldset key={axis.name} className="mt-8" disabled={busy}>
              <legend className="text-sm font-medium text-ink-900">{axis.name}</legend>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {axis.values.map((entry) => {
                  const selected = selections[axis.name] === entry.value;
                  // Only flag a value as too-small when it's the axis that
                  // actually drives the resolution requirement (Quantity
                  // never does). Simulates picking this value while keeping
                  // every other axis as currently selected.
                  const candidate = { ...selections, [axis.name]: entry.value };
                  const candidateRequirement = resolutionRequirementFor(
                    config,
                    candidate,
                  );
                  // Judged on what would be printed at THAT size's shape, with
                  // the customer's current framing — same rule as `resolution`.
                  const candidateAspect = printAspectFor(config, candidate);
                  const candidateCrop =
                    picked && candidateAspect
                      ? cropRect(
                          picked,
                          edit,
                          candidateAspect.width / candidateAspect.height,
                        )
                      : null;
                  const tooSmall =
                    candidateCrop && candidateRequirement
                      ? !resolutionFor(candidateRequirement, candidateCrop).ok
                      : false;

                  return (
                    <button
                      key={entry.value}
                      type="button"
                      onClick={() =>
                        setSelections((previous) => ({
                          ...previous,
                          [axis.name]: entry.value,
                        }))
                      }
                      aria-pressed={selected}
                      className={cn(
                        "rounded-card border px-3 py-3 text-left transition-colors",
                        selected
                          ? "border-brand-500 bg-brand-50"
                          : "border-ink-200 bg-white hover:border-ink-300",
                      )}
                    >
                      <span className="block font-medium text-ink-950">
                        {entry.value}
                      </span>
                      {entry.detail ? (
                        <span className="mt-0.5 block text-xs text-ink-500">
                          {entry.detail}
                        </span>
                      ) : null}
                      {tooSmall ? (
                        <span className="mt-1 block text-xs font-medium text-brand-600">
                          Low res
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}

          {resolution ? (
            resolution.ok ? (
              <p className="mt-4 flex items-start gap-2 text-sm text-ink-600">
                <CheckIcon className="mt-0.5 size-4 shrink-0 text-success" />
                Sharp enough for this size. This will print beautifully.
              </p>
            ) : (
              <div className="mt-4 rounded-card border border-brand-200 bg-brand-50 p-4">
                <p className="text-sm font-medium text-ink-950">
                  This image is soft for the size you picked
                </p>
                <p className="mt-1 text-sm text-ink-600 text-pretty">
                  {adjusted ? "The part you've framed is" : "It's"}{" "}
                  {printed?.width} × {printed?.height}. For a crisp print
                  we&apos;d want at least {resolution.needShort} ×{" "}
                  {resolution.needLong}
                  {config.splitPanels ? " — this one spans three panels side by side" : ""}
                  . You can still order it — it will look slightly fuzzy up
                  close — or {edit.zoom > 1 ? "zoom back out, or " : ""}pick a
                  smaller size.
                </p>
              </div>
            )
          ) : null}

          <div className="mt-8">
            <label htmlFor="custom-note" className="text-sm font-medium text-ink-900">
              Anything we should know?{" "}
              <span className="font-normal text-ink-500">(optional)</span>
            </label>
            <textarea
              id="custom-note"
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              disabled={busy}
              maxLength={500}
              placeholder="Crop it square, keep the border, that sort of thing."
              className="mt-2 w-full rounded-card border border-ink-200 bg-white px-4 py-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none disabled:opacity-60"
            />
          </div>

          <div className="mt-8 flex items-center gap-3">
            <QuantityStepper
              value={quantity}
              onChange={setQuantity}
              disabled={busy}
            />
            <p className="flex items-center gap-1.5 text-sm text-ink-600">
              <span className="size-1.5 rounded-full bg-success" />
              Printed to order
            </p>
          </div>

          {/* Same order and emphasis as the product page: primary "Add to
              cart" on the left, "Buy now" second. These were reversed here,
              so a shopper moving between a catalogue poster and a custom one
              had the two buttons swap places mid-session. */}
          <div ref={actionsRef} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              className="flex-1"
              disabled={!ready || busy}
              onClick={() => submit("drawer")}
            >
              {!buying && phase === "preparing"
                ? "Preparing your artwork…"
                : !buying && phase === "uploading"
                  ? "Uploading your artwork…"
                  : !buying && phase === "adding"
                    ? "Adding to cart…"
                    : picked
                      ? "Add to cart"
                      : "Upload an image to continue"}
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="flex-1"
              disabled={!ready || busy}
              onClick={() => submit("checkout")}
            >
              {buying
                ? phase === "preparing"
                  ? "Preparing your artwork…"
                  : phase === "uploading"
                    ? "Uploading your artwork…"
                    : "Starting checkout…"
                : "Buy now"}
            </Button>
          </div>

          {error ? (
            <p role="alert" className="mt-3 text-sm font-medium text-brand-700">
              {error}
            </p>
          ) : null}

          {/* Same reassurance block the regular product page shows under its
              buy button — delivery estimate, size guide, payment marks. */}
          <BuyReassurance />

          <p className="mt-6 text-xs text-ink-500 text-pretty">
            We only use your image to print your poster. It isn&apos;t shared,
            and we don&apos;t sell prints of it to anyone else.
          </p>
        </div>
      </div>

      {/* Mirrors AddToCart's sticky mobile bar exactly, so scrolling a custom
          order feels identical to scrolling any other product page. */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-ink-100 bg-paper/95 backdrop-blur-md transition-transform duration-300 ease-out-soft sm:hidden",
          showSticky ? "translate-y-0" : "translate-y-full",
        )}
        aria-hidden={!showSticky}
        inert={!showSticky}
      >
        <div className="flex items-center gap-3 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-ink-600">{config.label}</p>
            <Price price={displayPrice} showDiscount={false} className="mt-0.5" />
          </div>
          <Button
            size="lg"
            className="shrink-0 px-7"
            disabled={!ready || busy}
            onClick={() => submit("drawer")}
          >
            {busy ? "Working…" : "Add to cart"}
          </Button>
        </div>
      </div>
    </>
  );
}

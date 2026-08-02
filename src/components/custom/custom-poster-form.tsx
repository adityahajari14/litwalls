"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useCart } from "@/components/cart/cart-provider";
import { CheckIcon, CloseIcon, UploadIcon } from "@/components/icons";
import { BuyReassurance } from "@/components/product/buy-reassurance";
import { QuantityStepper } from "@/components/product/quantity-stepper";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/ui/price";
import { withClaimedDiscount } from "@/lib/checkout-url";
import {
  ACCEPTED_MIME_TYPES,
  checkFile,
  formatBytes,
  MAX_FILE_BYTES,
  PRINT_SIZES,
  resolutionFor,
  type PrintSizeId,
} from "@/lib/custom-poster";
import { addCustomPoster, createArtworkUpload } from "@/lib/shopify/actions";
import type { StagedTarget } from "@/lib/shopify/admin";
import type { Money } from "@/lib/shopify/types";
import { cn } from "@/lib/cn";

type Picked = {
  file: File;
  /** Object URL for the preview. Revoked on replace — these leak otherwise. */
  previewUrl: string;
  width: number;
  height: number;
};

type Phase = "idle" | "uploading" | "adding";

/**
 * Reads the image's true pixel dimensions by decoding it in the browser.
 *
 * This is the only way to know whether a file can actually print at A3 — the
 * file's byte size says nothing about it. A 200KB vector-flat PNG can be huge
 * in pixels; a 12MB phone photo can be a 1000px screenshot someone upscaled.
 */
function readImage(file: File) {
  return new Promise<{ url: string; width: number; height: number } | null>(
    (resolve) => {
      const url = URL.createObjectURL(file);
      const img = new window.Image();

      img.onload = () =>
        resolve({ url, width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };

      img.src = url;
    },
  );
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

export function CustomPosterForm({ price }: { price: Money }) {
  const [picked, setPicked] = useState<Picked | null>(null);
  const [sizeId, setSizeId] = useState<PrintSizeId>("A4");
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
        width: image.width,
        height: image.height,
      };
    });
  }

  function clear() {
    setPicked((previous) => {
      if (previous) URL.revokeObjectURL(previous.previewUrl);
      return null;
    });
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  /**
   * Unlike a catalogue product, there is no cart line to add to until the
   * artwork has actually finished uploading — so "Buy now" here means upload
   * first, then go straight to checkout, rather than the one-step addItem
   * the regular AddToCart button gets to do.
   */
  async function submit(then: "drawer" | "checkout") {
    if (!picked) return;

    setError(null);
    if (then === "checkout") setBuying(true);
    setPhase("uploading");

    try {
      const staged = await createArtworkUpload({
        name: picked.file.name,
        type: picked.file.type,
        size: picked.file.size,
      });

      if (!staged.ok) {
        setError(staged.message);
        setPhase("idle");
        setBuying(false);
        return;
      }

      await uploadToShopify(staged.target, picked.file);

      setPhase("adding");

      const result = await addCustomPoster({
        artworkUrl: staged.target.resourceUrl,
        sizeId,
        note,
        quantity,
      });

      if (!result.ok) {
        setError(result.message);
        setPhase("idle");
        setBuying(false);
        return;
      }

      const cart = await refresh();

      if (then === "checkout") {
        if (cart?.checkoutUrl) {
          window.location.href = withClaimedDiscount(cart.checkoutUrl);
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

  const size = PRINT_SIZES.find((entry) => entry.id === sizeId)!;
  const resolution = picked ? resolutionFor(size, picked) : null;
  const busy = phase !== "idle";

  return (
    <>
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
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
              <div className="relative aspect-4/5 overflow-hidden rounded-card bg-ink-100">
                {/* Object URL, not a remote image — next/image would need this
                    host allowlisted, and there is nothing to optimise anyway. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={picked.previewUrl}
                  alt="Your artwork"
                  className="size-full object-contain"
                />

                <button
                  type="button"
                  onClick={clear}
                  disabled={busy}
                  aria-label="Remove image"
                  className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-ink-950/70 text-white backdrop-blur transition-colors hover:bg-ink-950 disabled:opacity-50"
                >
                  <CloseIcon className="size-4" />
                </button>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-card border border-ink-200 bg-white px-4 py-3">
                <p className="truncate text-sm text-ink-600">{picked.file.name}</p>
                <p className="shrink-0 text-xs text-ink-500">
                  {picked.width} × {picked.height}
                </p>
              </div>
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
            Your image, our paper
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Price price={price} showDiscount={false} className="text-xl" />
          </div>
          <p className="mt-1 text-sm text-ink-500">
            Inclusive of all taxes. Shipping calculated at checkout.
          </p>

          <fieldset className="mt-8" disabled={busy}>
            <legend className="text-sm font-medium text-ink-900">Size</legend>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {PRINT_SIZES.map((entry) => {
                const selected = entry.id === sizeId;
                // Flag a size the file can't reach, but don't disable it —
                // explaining beats blocking, and they may want to swap the file.
                const tooSmall = picked ? !resolutionFor(entry, picked).ok : false;

                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setSizeId(entry.id)}
                    aria-pressed={selected}
                    className={cn(
                      "rounded-xl border px-3 py-3 text-left transition-colors",
                      selected
                        ? "border-brand-500 bg-brand-50"
                        : "border-ink-200 bg-white hover:border-ink-300",
                    )}
                  >
                    <span className="block font-medium text-ink-950">
                      {entry.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-500">
                      {entry.mm}
                    </span>
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

          {resolution ? (
            resolution.ok ? (
              <p className="mt-4 flex items-start gap-2 text-sm text-ink-600">
                <CheckIcon className="mt-0.5 size-4 shrink-0 text-success" />
                Sharp enough for {size.label}. This will print beautifully.
              </p>
            ) : (
              <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50 p-4">
                <p className="text-sm font-medium text-ink-950">
                  This image is soft for {size.label}
                </p>
                <p className="mt-1 text-sm text-ink-600 text-pretty">
                  It&apos;s {picked?.width} × {picked?.height}. For a crisp{" "}
                  {size.label} we&apos;d want at least {resolution.needShort} ×{" "}
                  {resolution.needLong}. You can still order it — it will look
                  slightly fuzzy up close — or pick a smaller size.
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
              className="mt-2 w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none disabled:opacity-60"
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

          <div ref={actionsRef} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              variant="secondary"
              className="flex-1"
              disabled={!picked || busy}
              onClick={() => submit("checkout")}
            >
              {buying
                ? phase === "uploading"
                  ? "Uploading your artwork…"
                  : "Starting checkout…"
                : "Buy now"}
            </Button>
            <Button
              size="lg"
              className="flex-1"
              disabled={!picked || busy}
              onClick={() => submit("drawer")}
            >
              {!buying && phase === "uploading"
                ? "Uploading your artwork…"
                : !buying && phase === "adding"
                  ? "Adding to cart…"
                  : picked
                    ? "Add to cart"
                    : "Upload an image to continue"}
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
            <p className="truncate text-xs text-ink-600">Custom poster</p>
            <Price price={price} showDiscount={false} className="mt-0.5" />
          </div>
          <Button
            size="lg"
            className="shrink-0 px-7"
            disabled={!picked || busy}
            onClick={() => submit("drawer")}
          >
            {busy ? "Working…" : "Add to cart"}
          </Button>
        </div>
      </div>
    </>
  );
}

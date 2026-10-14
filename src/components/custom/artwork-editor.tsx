"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { CheckIcon, RotateIcon } from "@/components/icons";
import {
  cropRect,
  DEFAULT_EDIT,
  drawEdit,
  isDefaultEdit,
  MAX_ZOOM,
  panned,
  turned,
  zoomed,
  type ArtworkEdit,
  type Size,
} from "@/lib/artwork-edit";
import { cn } from "@/lib/cn";

type SetEdit = React.Dispatch<React.SetStateAction<ArtworkEdit>>;

/** Long edge of the working copy the preview draws from. */
const PREVIEW_EDGE = 1600;

/**
 * A scaled-down copy of the artwork for the preview to draw from.
 *
 * A print-resolution upload is 15–40 megapixels. Resampling that to a
 * phone-width canvas on every frame of a drag is what makes an editor feel
 * like it is wading through mud; resampling it once, here, is not.
 */
function workingCopy(image: HTMLImageElement, size: Size): HTMLCanvasElement {
  const scale = Math.min(1, PREVIEW_EDGE / Math.max(size.width, size.height));

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(size.width * scale));
  canvas.height = Math.max(1, Math.round(size.height * scale));
  canvas
    .getContext("2d")
    ?.drawImage(image, 0, 0, canvas.width, canvas.height);

  return canvas;
}

/**
 * The artwork, framed exactly as it will print.
 *
 * Always a canvas drawn through `drawEdit` — the same function that renders
 * the file that gets uploaded — so the preview cannot show one crop while the
 * printer receives another.
 *
 * Dragging only works while `editing`. The frame is most of a phone screen
 * tall, and a canvas that claimed every touch would leave no way to scroll
 * past it to the "Add to cart" button underneath.
 */
export function ArtworkCanvas({
  image,
  size,
  edit,
  setEdit,
  ratio,
  editing,
}: {
  image: HTMLImageElement;
  /** The image's natural pixel size — the space `edit` is expressed in. */
  size: Size;
  edit: ArtworkEdit;
  setEdit: SetEdit;
  /** Print width ÷ height. The parent sizes this canvas to match. */
  ratio: number;
  editing: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [box, setBox] = useState<Size | null>(null);

  const preview = useMemo(() => workingCopy(image, size), [image, size]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setBox({ width, height });
    });

    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !box || box.width < 1) return;

    // Capped at 2×: a 3× phone would otherwise redraw nine times the pixels
    // per frame for a difference nobody can see mid-drag.
    const density = Math.min(2, window.devicePixelRatio || 1);
    const out = {
      width: Math.round(box.width * density),
      height: Math.round(box.height * density),
    };

    if (canvas.width !== out.width || canvas.height !== out.height) {
      canvas.width = out.width;
      canvas.height = out.height;
    }

    const context = canvas.getContext("2d");
    if (context) drawEdit(context, preview, size, edit, ratio, out);
  }, [preview, size, edit, ratio, box]);

  // Scroll-to-zoom, only while editing. Attached by hand because React's
  // onWheel is passive and so cannot stop the page scrolling underneath.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !editing) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const factor = event.deltaY < 0 ? 1.08 : 1 / 1.08;
      setEdit((previous) => zoomed(size, previous, ratio, previous.zoom * factor));
    };

    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [editing, size, ratio, setEdit]);

  // Live pointers, for telling a one-finger drag from a two-finger pinch.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchDistance = useRef<number | null>(null);

  function release(event: React.PointerEvent) {
    pointers.current.delete(event.pointerId);
    pinchDistance.current = null;
  }

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={
        editing
          ? "Your artwork. Drag to reposition, pinch or scroll to zoom, arrow keys to nudge."
          : "Your artwork, framed as it will print"
      }
      tabIndex={editing ? 0 : -1}
      className={cn(
        "block size-full outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-inset",
        editing && "cursor-grab touch-none active:cursor-grabbing",
      )}
      onPointerDown={(event) => {
        if (!editing) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        pointers.current.set(event.pointerId, {
          x: event.clientX,
          y: event.clientY,
        });
        pinchDistance.current = null;
      }}
      onPointerMove={(event) => {
        const last = pointers.current.get(event.pointerId);
        if (!editing || !last || !box) return;

        const now = { x: event.clientX, y: event.clientY };
        pointers.current.set(event.pointerId, now);

        if (pointers.current.size >= 2) {
          const [a, b] = [...pointers.current.values()];
          const distance = Math.hypot(a.x - b.x, a.y - b.y);
          const before = pinchDistance.current;
          pinchDistance.current = distance;

          if (before && before > 0) {
            const factor = distance / before;
            setEdit((previous) =>
              zoomed(size, previous, ratio, previous.zoom * factor),
            );
          }
          return;
        }

        const dx = now.x - last.x;
        const dy = now.y - last.y;

        setEdit((previous) => {
          // Screen pixels → image pixels, at whatever zoom is current.
          const perPixel = cropRect(size, previous, ratio).width / box.width;
          return panned(size, previous, ratio, dx * perPixel, dy * perPixel);
        });
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onKeyDown={(event) => {
        if (!editing) return;

        const step = (dx: number, dy: number) => {
          event.preventDefault();
          setEdit((previous) => {
            const crop = cropRect(size, previous, ratio);
            return panned(
              size,
              previous,
              ratio,
              dx * crop.width * 0.03,
              dy * crop.height * 0.03,
            );
          });
        };
        const zoom = (factor: number) => {
          event.preventDefault();
          setEdit((previous) =>
            zoomed(size, previous, ratio, previous.zoom * factor),
          );
        };

        if (event.key === "ArrowLeft") step(1, 0);
        else if (event.key === "ArrowRight") step(-1, 0);
        else if (event.key === "ArrowUp") step(0, 1);
        else if (event.key === "ArrowDown") step(0, -1);
        else if (event.key === "+" || event.key === "=") zoom(1.1);
        else if (event.key === "-") zoom(1 / 1.1);
      }}
    />
  );
}

/**
 * Zoom, rotate, reset and done — shown under the frame while editing.
 */
export function ArtworkToolbar({
  size,
  edit,
  setEdit,
  ratio,
  onDone,
}: {
  size: Size;
  edit: ArtworkEdit;
  setEdit: SetEdit;
  ratio: number;
  onDone: () => void;
}) {
  const zoomBy = (factor: number) =>
    setEdit((previous) => zoomed(size, previous, ratio, previous.zoom * factor));

  const stepClass =
    "grid size-10 shrink-0 place-items-center rounded-full text-lg text-ink-700 transition-colors hover:bg-ink-100 hover:text-ink-950 disabled:pointer-events-none disabled:text-ink-300";

  return (
    <div className="rounded-card border border-ink-200 bg-white p-3">
      <div className="flex items-center gap-1">
        <button
          type="button"
          className={stepClass}
          onClick={() => zoomBy(1 / 1.15)}
          disabled={edit.zoom <= 1}
          aria-label="Zoom out"
        >
          −
        </button>
        <input
          type="range"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={edit.zoom}
          onChange={(event) => {
            const zoom = Number(event.target.value);
            setEdit((previous) => zoomed(size, previous, ratio, zoom));
          }}
          aria-label="Zoom"
          className="h-10 min-w-0 flex-1 accent-brand-500"
        />
        <button
          type="button"
          className={stepClass}
          onClick={() => zoomBy(1.15)}
          disabled={edit.zoom >= MAX_ZOOM}
          aria-label="Zoom in"
        >
          +
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setEdit(turned)}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-ink-200 px-4 text-sm font-medium text-ink-800 transition-colors hover:border-ink-950"
        >
          <RotateIcon className="size-4" />
          Rotate
        </button>
        <button
          type="button"
          onClick={() => setEdit(DEFAULT_EDIT)}
          disabled={isDefaultEdit(edit)}
          className="inline-flex h-10 items-center rounded-full px-4 text-sm font-medium text-ink-600 transition-colors hover:text-ink-950 disabled:pointer-events-none disabled:text-ink-300"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={onDone}
          className="ml-auto inline-flex h-10 items-center gap-2 rounded-full bg-ink-950 px-5 text-sm font-medium text-white transition-colors hover:bg-ink-800"
        >
          <CheckIcon className="size-4" />
          Done
        </button>
      </div>
    </div>
  );
}

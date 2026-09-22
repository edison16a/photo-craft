"use client";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { positionPopover, type Placement } from "@/lib/popover-position";

interface PopoverProps {
  open: boolean;
  /** The button or field the popover belongs to. */
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  label: string;
  width?: number;
  children: ReactNode;
}

/**
 * A floating panel rendered at the end of the document so no scrolling
 * container can clip it. It measures itself and picks a side that keeps it
 * on screen, and closes on an outside click or Escape.
 */
export function Popover({ open, anchorRef, onClose, label, width, children }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<Placement | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setPlacement(null);
      return;
    }
    const update = () => {
      const anchor = anchorRef.current?.getBoundingClientRect();
      const box = ref.current?.getBoundingClientRect();
      if (!anchor || !box) return;
      setPlacement(positionPopover(anchor, { width: box.width, height: box.height }, { width: window.innerWidth, height: window.innerHeight }));
    };
    update();
    const observer = new ResizeObserver(update);
    if (ref.current) observer.observe(ref.current);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    // The anchor can move without any scroll event, for example a toolbar
    // button when the canvas zooms or pans. Watch its position each frame.
    let frame = 0;
    let last = "";
    const follow = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      const key = rect ? `${rect.top},${rect.left}` : "";
      if (key !== last) {
        last = key;
        update();
      }
      frame = requestAnimationFrame(follow);
    };
    frame = requestAnimationFrame(follow);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (ref.current?.contains(target) || anchorRef.current?.contains(target)) return;
      onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      onClose();
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open, onClose, anchorRef]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={ref}
      className="popover"
      role="dialog"
      aria-label={label}
      data-popover="true"
      style={{
        top: placement?.top ?? 0,
        left: placement?.left ?? 0,
        width,
        visibility: placement ? "visible" : "hidden",
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

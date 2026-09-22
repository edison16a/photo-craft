"use client";
import { useEffect, useState } from "react";
import type { ImageElement } from "@/model/types";
import { useEditorUiStore } from "@/store/editor-ui-store";
import { useProjectStore } from "@/store/project-store";
import { selectCurrentElements } from "@/store/selectors";
import { CompareView } from "../../ui/CompareView";
import { Sparkles } from "../../ui/Sparkles";

/** How long the reveal sweep takes. Matches the stylesheet's transition. */
const REVEAL_MS = 1400;

/** Where an element sits on the workspace, in screen pixels, plus how it is turned and flipped. */
function screenBox(element: ImageElement, zoom: number, pan: { x: number; y: number }) {
  return {
    left: pan.x + element.x * zoom,
    top: pan.y + element.y * zoom,
    width: element.width * zoom,
    height: element.height * zoom,
    transform: `rotate(${element.rotation}deg) scale(${element.flipX ? -1 : 1}, ${element.flipY ? -1 : 1})`,
  };
}

interface RevealBoxProps {
  element: ImageElement;
  originalSrc: string;
  cutoutSrc: string;
  zoom: number;
  pan: { x: number; y: number };
}

/** The sweep that plays over an image once its cutout has arrived. */
function RevealBox({ element, originalSrc, cutoutSrc, zoom, pan }: RevealBoxProps) {
  const [split, setSplit] = useState(1);
  const [revealing, setRevealing] = useState(false);

  useEffect(() => {
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        setRevealing(true);
        setSplit(0);
      });
    });
    const timer = setTimeout(() => useEditorUiStore.getState().endReveal(), REVEAL_MS + 100);
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
      clearTimeout(timer);
    };
  }, []);

  const box = screenBox(element, zoom, pan);
  return (
    <div className="image-effect" style={box} aria-hidden="true">
      <CompareView originalUrl={originalSrc} cutoutUrl={cutoutSrc} split={split} revealing={revealing} className="image-effect__compare" />
    </div>
  );
}

/**
 * Overlays on images in the editor: twinkling stars while a background is
 * being removed, and the reveal sweep when the cutout lands. Both sit on
 * top of the canvas at the image's own place, size and angle.
 */
export function ImageEffectsOverlay() {
  const busyIds = useEditorUiStore((s) => s.busyImageIds);
  const reveal = useEditorUiStore((s) => s.reveal);
  const zoom = useEditorUiStore((s) => s.zoom);
  const pan = useEditorUiStore((s) => s.pan);
  const elements = useProjectStore(selectCurrentElements);
  const images = elements.filter((element): element is ImageElement => element.type === "image");
  const busy = images.filter((element) => busyIds.includes(element.id));
  const revealed = reveal ? images.find((element) => element.id === reveal.elementId) : undefined;

  return (
    <>
      {busy.map((element) => (
        <div key={element.id} className="image-effect image-effect--busy" style={screenBox(element, zoom, pan)} aria-hidden="true">
          <Sparkles seed={element.id} />
        </div>
      ))}
      {reveal && revealed ? <RevealBox key={reveal.elementId} element={revealed} originalSrc={reveal.originalSrc} cutoutSrc={reveal.cutoutSrc} zoom={zoom} pan={pan} /> : null}
    </>
  );
}

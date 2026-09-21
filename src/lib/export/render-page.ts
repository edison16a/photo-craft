/**
 * Renders a page to an offscreen canvas with plain Konva.
 *
 * This is the single source of truth for exports and thumbnails. It uses
 * the same attribute builders as the live editor, loads the fonts and
 * images a page needs, draws once and tears the stage down.
 */
import type Konva from "konva";
import type { CanvasElement, Page, Project } from "../../model/types";
import { ensureFontsLoaded } from "../font-loader";
import { getCachedImage } from "../image-cache";
import { flipAttrs, groupAttrs, imageAttrs, shapeNodeSpec, textAttrs } from "../konva/element-attrs";

export interface RenderPageOptions {
  /** Output pixels per page pixel. 2 doubles the size. */
  pixelRatio: number;
  /** Skip the background so the output keeps transparency. */
  transparent: boolean;
}

type KonvaModule = typeof Konva;

/** Konva is browser only, so it is loaded on first use rather than at import. */
async function loadKonva(): Promise<KonvaModule> {
  const mod = await import("konva");
  return mod.default;
}

function fontFamiliesIn(page: Page): string[] {
  const families = new Set<string>();
  for (const element of page.elements) {
    if (element.type === "text") families.add(element.fontFamily);
  }
  return [...families];
}

async function imagesIn(page: Page): Promise<Map<string, HTMLImageElement>> {
  const map = new Map<string, HTMLImageElement>();
  const sources = [...new Set(page.elements.filter((e) => e.type === "image").map((e) => e.src))];
  await Promise.all(
    sources.map(async (src) => {
      try {
        map.set(src, await getCachedImage(src));
      } catch {
        // A broken image is skipped rather than failing the whole export.
      }
    }),
  );
  return map;
}

/** Builds the Konva node tree for one element. */
function buildElementNode(
  K: KonvaModule,
  element: CanvasElement,
  images: Map<string, HTMLImageElement>,
): Konva.Group {
  const outer = new K.Group(groupAttrs(element));
  const inner = new K.Group(flipAttrs(element));
  outer.add(inner);

  if (element.type === "text") {
    inner.add(new K.Text(textAttrs(element)));
  } else if (element.type === "image") {
    const image = images.get(element.src);
    if (image) inner.add(new K.Image({ image, ...imageAttrs(element) }));
  } else {
    const spec = shapeNodeSpec(element);
    if (spec.node === "rect") inner.add(new K.Rect(spec.attrs));
    else if (spec.node === "ellipse") inner.add(new K.Ellipse(spec.attrs as Konva.EllipseConfig));
    else if (spec.node === "arrow") inner.add(new K.Arrow(spec.attrs as Konva.ArrowConfig));
    else inner.add(new K.Line(spec.attrs as Konva.LineConfig));
  }
  return outer;
}

/** Renders a page and returns the canvas element. */
export async function renderPageToCanvas(
  project: Pick<Project, "width" | "height">,
  page: Page,
  options: RenderPageOptions,
): Promise<HTMLCanvasElement> {
  const K = await loadKonva();
  const [images] = await Promise.all([imagesIn(page), ensureFontsLoaded(fontFamiliesIn(page))]);

  const container = document.createElement("div");
  const stage = new K.Stage({ container, width: project.width, height: project.height });
  const layer = new K.Layer({ listening: false });
  stage.add(layer);

  if (!options.transparent) {
    const fill = page.background === "transparent" ? "#ffffff" : page.background;
    layer.add(new K.Rect({ x: 0, y: 0, width: project.width, height: project.height, fill }));
  }
  for (const element of page.elements) {
    layer.add(buildElementNode(K, element, images));
  }
  layer.draw();

  try {
    return stage.toCanvas({ pixelRatio: options.pixelRatio });
  } finally {
    stage.destroy();
  }
}

/** Renders a page straight to a data URL. */
export async function renderPageToDataUrl(
  project: Pick<Project, "width" | "height">,
  page: Page,
  options: RenderPageOptions & { mimeType: string; quality?: number },
): Promise<string> {
  const canvas = await renderPageToCanvas(project, page, options);
  return canvas.toDataURL(options.mimeType, options.quality);
}

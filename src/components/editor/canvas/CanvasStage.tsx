"use client";
import type { KonvaEventObject } from "konva/lib/Node";
import { useRef } from "react";
import { Group, Layer, Stage } from "react-konva";
import { useAddElement } from "@/hooks/use-add-element";
import { useEditorUiStore } from "@/store/editor-ui-store";
import { useProjectStore } from "@/store/project-store";
import { selectCurrentPage } from "@/store/selectors";
import { screenToPage } from "@/store/viewport-actions";
import { ElementNode } from "./ElementNode";
import { GuideLines, LockedOutlines, MarqueeRect } from "./OverlayShapes";
import { PAGE_BACKGROUND_NAME, PageBackground } from "./PageBackground";
import { SelectionTransformer } from "./SelectionTransformer";
import { TextEditOverlay } from "./TextEditOverlay";
import { useCanvasDrop } from "./use-canvas-drop";
import { useMarquee } from "./use-marquee";
import { useViewport } from "./use-viewport";

/**
 * The workspace: a Konva stage with the page, its elements, the selection
 * transformer and the overlay for guides and the marquee. Loaded on the
 * client only because Konva needs a real canvas.
 */
export function CanvasStage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { size, zoom, pan, onWheel } = useViewport(containerRef);
  const project = useProjectStore((s) => s.project);
  const page = useProjectStore(selectCurrentPage);
  const selectedIds = useProjectStore((s) => s.selectedIds);
  const tool = useEditorUiStore((s) => s.tool);
  const guides = useEditorUiStore((s) => s.guides);
  const marquee = useMarquee();
  const drop = useCanvasDrop(containerRef, screenToPage);
  const { addText } = useAddElement();

  if (!project || !page) return <div ref={containerRef} className="workspace" />;

  const elements = page.elements;
  const lockedSelected = elements.filter((el) => el.locked && selectedIds.includes(el.id));

  const pointerOnPage = (event: KonvaEventObject<MouseEvent | TouchEvent>) => {
    const stage = event.target.getStage();
    const pointer = stage?.getPointerPosition();
    return pointer ? screenToPage(pointer) : null;
  };

  const onMouseDown = (event: KonvaEventObject<MouseEvent>) => {
    const stage = event.target.getStage();
    const onEmpty = event.target === stage || event.target.name() === PAGE_BACKGROUND_NAME;
    const point = pointerOnPage(event);
    if (!onEmpty || !point) return;
    if (tool === "text") {
      void addText({ x: Math.round(point.x), y: Math.round(point.y) });
      return;
    }
    if (tool !== "select") return;
    if (!event.evt.shiftKey) useProjectStore.getState().clearSelection();
    marquee.begin(point, event.evt.shiftKey);
  };

  const onMouseMove = (event: KonvaEventObject<MouseEvent>) => {
    if (!marquee.marquee) return;
    const point = pointerOnPage(event);
    if (point) marquee.move(point);
  };

  return (
    <div
      ref={containerRef}
      className={`workspace workspace--${tool}`}
      onDragOver={drop.onDragOver}
      onDrop={drop.onDrop}
    >
      {size.width > 0 ? (
        <Stage
          width={size.width}
          height={size.height}
          scaleX={zoom}
          scaleY={zoom}
          x={pan.x}
          y={pan.y}
          onWheel={onWheel}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={marquee.finish}
          onMouseLeave={marquee.finish}
        >
          <Layer>
            <PageBackground width={project.width} height={project.height} background={page.background} />
            <Group clipX={0} clipY={0} clipWidth={project.width} clipHeight={project.height}>
              {elements.map((element) => (
                <ElementNode key={element.id} element={element} />
              ))}
            </Group>
          </Layer>
          <Layer listening={false}>
            <GuideLines guides={guides} pageWidth={project.width} pageHeight={project.height} zoom={zoom} />
            <LockedOutlines elements={lockedSelected} zoom={zoom} />
            <MarqueeRect rect={marquee.rect} zoom={zoom} />
          </Layer>
          <Layer>
            <SelectionTransformer />
          </Layer>
        </Stage>
      ) : null}
      <TextEditOverlay />
    </div>
  );
}

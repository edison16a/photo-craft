"use client";
import type { KonvaEventObject } from "konva/lib/Node";
import { useEffect, useRef } from "react";
import { Group, Layer, Stage } from "react-konva";
import { useAddElement } from "@/hooks/use-add-element";
import { blurActiveField } from "@/lib/focus";
import { useEditorUiStore } from "@/store/editor-ui-store";
import { useProjectStore } from "@/store/project-store";
import { selectCurrentPage } from "@/store/selectors";
import { screenToPage } from "@/store/viewport-actions";
import { ContextMenu } from "./ContextMenu";
import { DrawPreview } from "./DrawPreview";
import { ElementNode } from "./ElementNode";
import { GuideLines, LockedOutlines, MarqueeRect } from "./OverlayShapes";
import { PAGE_BACKGROUND_NAME, PageBackground } from "./PageBackground";
import { QuickToolbar } from "./QuickToolbar";
import { SelectionTransformer } from "./SelectionTransformer";
import { TextEditOverlay } from "./TextEditOverlay";
import { useCanvasDrop } from "./use-canvas-drop";
import { useMarquee } from "./use-marquee";
import { useShapeDrawing } from "./use-shape-drawing";
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
  const drawing = useShapeDrawing();
  const drawOptions = useEditorUiStore((s) => s.drawOptions);
  const drawPoints = useEditorUiStore((s) => s.drawPoints);
  const drawStroke = useEditorUiStore((s) => s.drawStroke);
  const drop = useCanvasDrop(containerRef, screenToPage);
  const { addText } = useAddElement();
  const pendingTextAt = useEditorUiStore((s) => s.pendingTextAt);

  // "Add text here" from the right click menu.
  useEffect(() => {
    if (!pendingTextAt) return;
    useEditorUiStore.getState().clearTextRequest();
    void addText({ x: Math.round(pendingTextAt.x), y: Math.round(pendingTextAt.y) });
  }, [pendingTextAt, addText]);

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
    if (!point) return;
    if (tool === "draw") {
      // Drawing works over elements too, so it does not wait for empty space.
      if (event.evt.button !== 0) return;
      blurActiveField();
      drawing.onMouseDown(point);
      return;
    }
    if (!onEmpty) return;
    blurActiveField();
    if (tool === "text") {
      // Stop the browser moving focus on this mousedown, or it would blur the
      // text editor that opens for the new element.
      event.evt.preventDefault();
      void addText({ x: Math.round(point.x), y: Math.round(point.y) });
      return;
    }
    if (tool !== "select") return;
    if (!event.evt.shiftKey) useProjectStore.getState().clearSelection();
    marquee.begin(point, event.evt.shiftKey);
  };

  /** Right click: select what is under the pointer (keeping a multi selection) and open the menu. */
  const onContextMenu = (event: KonvaEventObject<PointerEvent>) => {
    event.evt.preventDefault();
    const point = pointerOnPage(event);
    if (!point) return;
    const group = event.target.findAncestor(".element", true);
    const elementId = group?.id();
    const store = useProjectStore.getState();
    if (elementId && !store.selectedIds.includes(elementId)) store.setSelection([elementId]);
    if (!elementId) store.clearSelection();
    useEditorUiStore.getState().openContextMenu({ x: event.evt.clientX, y: event.evt.clientY, point, elementId });
  };

  const onMouseMove = (event: KonvaEventObject<MouseEvent>) => {
    if (tool === "draw") {
      const point = pointerOnPage(event);
      if (point) drawing.onMouseMove(point);
      return;
    }
    if (!marquee.marquee) return;
    const point = pointerOnPage(event);
    if (point) marquee.move(point);
  };

  const onMouseUp = () => {
    if (tool === "draw") drawing.onMouseUp();
    else marquee.finish();
  };

  const onMouseLeave = () => {
    if (tool === "draw") drawing.onMouseLeave();
    else marquee.finish();
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
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
          onDblClick={tool === "draw" ? drawing.onDoubleClick : undefined}
          onContextMenu={onContextMenu}
        >
          <Layer>
            <PageBackground width={project.width} height={project.height} background={page.background} />
            {/* While drawing, clicks must reach the page even over elements. */}
            <Group clipX={0} clipY={0} clipWidth={project.width} clipHeight={project.height} listening={tool !== "draw"}>
              {elements.map((element) => (
                <ElementNode key={element.id} element={element} />
              ))}
            </Group>
          </Layer>
          <Layer listening={false}>
            <GuideLines guides={guides} pageWidth={project.width} pageHeight={project.height} zoom={zoom} />
            <LockedOutlines elements={lockedSelected} zoom={zoom} />
            <MarqueeRect rect={marquee.rect} zoom={zoom} />
            {tool === "draw" ? <DrawPreview points={drawPoints} stroke={drawStroke} hover={drawing.hover} options={drawOptions} zoom={zoom} /> : null}
          </Layer>
          <Layer listening={tool !== "draw"}>
            <SelectionTransformer />
          </Layer>
        </Stage>
      ) : null}
      <TextEditOverlay />
      <QuickToolbar />
      <ContextMenu />
    </div>
  );
}

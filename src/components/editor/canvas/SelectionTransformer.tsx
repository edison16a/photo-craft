"use client";
import type Konva from "konva";
import { useEffect, useRef } from "react";
import { Transformer } from "react-konva";
import { normalizeDegrees } from "@/lib/geometry";
import type { CanvasElement } from "@/model/types";
import { useEditorUiStore } from "@/store/editor-ui-store";
import { useProjectStore } from "@/store/project-store";
import { selectCurrentElements } from "@/store/selectors";

const CORNERS = ["top-left", "top-right", "bottom-left", "bottom-right"];
const SIDES = ["middle-left", "middle-right"];
const ALL_ANCHORS = [...CORNERS, "top-center", "bottom-center", ...SIDES];
const MIN_SIZE = 4;

/** Fields a transform can change. Font size only applies to text. */
type ElementPatch = Partial<CanvasElement> & { fontSize?: number };

/** Anchors and ratio lock depend on what is selected. */
function transformRules(selected: CanvasElement[]) {
  const onlyShapes = selected.length > 0 && selected.every((el) => el.type === "shape");
  const singleText = selected.length === 1 && selected[0].type === "text";
  if (onlyShapes) return { anchors: ALL_ANCHORS, keepRatio: false };
  if (singleText) return { anchors: [...CORNERS, ...SIDES], keepRatio: true };
  return { anchors: CORNERS, keepRatio: true };
}

/**
 * Konva transformer bound to the selected, unlocked elements. Images keep
 * their proportions. When a transform ends the node's scale is folded into
 * width, height and font size and the scale reset to one.
 */
export function SelectionTransformer() {
  const ref = useRef<Konva.Transformer>(null);
  const selectedIds = useProjectStore((s) => s.selectedIds);
  const elements = useProjectStore(selectCurrentElements);
  const tool = useEditorUiStore((s) => s.tool);
  const editing = useEditorUiStore((s) => s.editingTextId);

  const selected = elements.filter((el) => selectedIds.includes(el.id) && !el.locked);
  const rules = transformRules(selected);
  const visible = tool === "select" && selected.length > 0 && !editing;

  useEffect(() => {
    const transformer = ref.current;
    const stage = transformer?.getStage();
    if (!transformer || !stage) return;
    const nodes = visible
      ? selected.map((el) => stage.findOne(`#${el.id}`)).filter((n): n is Konva.Node => Boolean(n))
      : [];
    transformer.nodes(nodes);
    transformer.getLayer()?.batchDraw();
    // The dependency is the list of ids plus element identity, so a re-render of the nodes re-attaches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected.map((el) => el.id).join(","), elements, visible]);

  const commit = () => {
    const transformer = ref.current;
    if (!transformer) return;
    const patches: Record<string, ElementPatch> = {};
    for (const node of transformer.nodes()) {
      const element = selected.find((el) => el.id === node.id());
      if (!element) continue;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      const patch: ElementPatch = {
        x: round(node.x()),
        y: round(node.y()),
        rotation: round(normalizeDegrees(node.rotation())),
        width: Math.max(MIN_SIZE, round(element.width * scaleX)),
      };
      if (element.type === "text") {
        // Corner anchors scale the font, side anchors only change the wrap width.
        if (Math.abs(scaleX - scaleY) < 0.001) {
          patch.fontSize = Math.max(1, round(element.fontSize * scaleX));
        }
      } else {
        patch.height = Math.max(MIN_SIZE, round(element.height * scaleY));
      }
      node.scale({ x: 1, y: 1 });
      patches[element.id] = patch;
    }
    useProjectStore.getState().patchElements(patches);
  };

  return (
    <Transformer
      ref={ref}
      visible={visible}
      enabledAnchors={rules.anchors}
      keepRatio={rules.keepRatio}
      flipEnabled={false}
      rotateEnabled
      rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
      rotationSnapTolerance={4}
      rotateAnchorOffset={28}
      anchorSize={10}
      anchorCornerRadius={2}
      anchorStroke="#2b8cff"
      anchorFill="#ffffff"
      borderStroke="#2b8cff"
      borderStrokeWidth={1.5}
      ignoreStroke
      boundBoxFunc={(oldBox, newBox) =>
        Math.abs(newBox.width) < MIN_SIZE || Math.abs(newBox.height) < MIN_SIZE ? oldBox : newBox
      }
      onTransformEnd={commit}
    />
  );
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

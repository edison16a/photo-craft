"use client";
import type Konva from "konva";
import { useEffect, useMemo, useRef } from "react";
import { Transformer } from "react-konva";
import { normalizeDegrees } from "@/lib/geometry";
import { topLeftFromCentre } from "@/lib/konva/element-attrs";
import type { CanvasElement } from "@/model/types";
import { useEditorUiStore } from "@/store/editor-ui-store";
import { useProjectStore } from "@/store/project-store";
import { selectCurrentElements } from "@/store/selectors";

const CORNERS = ["top-left", "top-right", "bottom-left", "bottom-right"];
const SIDES = ["middle-left", "middle-right"];
const ALL_ANCHORS = [...CORNERS, "top-center", "bottom-center", ...SIDES];
const MIN_SIZE = 4;

/** Fields a transform can change. Font size only applies to text. */
type ElementPatch = Partial<CanvasElement> & { fontSize?: number; letterSpacing?: number };

/**
 * Anchors and ratio lock depend on what is selected. Free stretching is
 * only offered when every selected shape is axis aligned; stretching a
 * rotated node along the selection box would skew it.
 */
function transformRules(selected: CanvasElement[]) {
  const onlyShapes = selected.length > 0 && selected.every((el) => el.type === "shape");
  const axisAligned = selected.every((el) => el.rotation % 180 === 0);
  const singleText = selected.length === 1 && selected[0].type === "text";
  if (onlyShapes && (selected.length === 1 || axisAligned)) return { anchors: ALL_ANCHORS, keepRatio: false };
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

  const selected = useMemo(
    () => elements.filter((el) => selectedIds.includes(el.id) && !el.locked),
    [elements, selectedIds],
  );
  const rules = transformRules(selected);
  const visible = tool === "select" && selected.length > 0 && !editing;

  // Re-attach whenever the selection or the elements change, since a
  // re-render of the nodes can replace the Konva objects underneath.
  useEffect(() => {
    const transformer = ref.current;
    const stage = transformer?.getStage();
    if (!transformer || !stage) return;
    const nodes = visible
      ? selected.map((el) => stage.findOne(`#${el.id}`)).filter((n): n is Konva.Node => Boolean(n))
      : [];
    transformer.nodes(nodes);
    transformer.getLayer()?.batchDraw();
  }, [selected, visible]);

  /**
   * While a side anchor widens a text box, only the wrap width may change.
   * The group is being scaled by Konva, so the text node is counter scaled
   * and given the new width, which reflows the words without stretching.
   */
  const onTransform = () => {
    const transformer = ref.current;
    if (!transformer || selected.length !== 1 || selected[0].type !== "text") return;
    const node = transformer.nodes()[0];
    const text = (node as Konva.Group | undefined)?.findOne("Text") as Konva.Text | undefined;
    if (!node || !text) return;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    if (Math.abs(scaleX - scaleY) < 0.001) {
      text.setAttrs({ scaleX: 1, width: selected[0].width });
      return;
    }
    text.setAttrs({ scaleX: 1 / scaleX, width: selected[0].width * scaleX });
  };

  const commit = () => {
    const transformer = ref.current;
    if (!transformer) return;
    const patches: Record<string, ElementPatch> = {};
    for (const node of transformer.nodes()) {
      const element = selected.find((el) => el.id === node.id());
      if (!element) continue;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      const width = Math.max(MIN_SIZE, round(element.width * scaleX));
      // Text keeps an auto height, so its stored height is measured later.
      const height = Math.max(MIN_SIZE, round(element.height * scaleY));
      // The node's position is the centre of the box, see groupAttrs.
      const topLeft = topLeftFromCentre(node.position(), width, height);
      const patch: ElementPatch = {
        x: round(topLeft.x),
        y: round(topLeft.y),
        rotation: round(normalizeDegrees(node.rotation())),
        width,
      };
      if (element.type === "text") {
        // Corner anchors scale the font, side anchors only change the wrap width.
        if (Math.abs(scaleX - scaleY) < 0.001) {
          patch.fontSize = Math.max(1, round(element.fontSize * scaleX));
          patch.letterSpacing = round(element.letterSpacing * scaleX);
        }
      } else {
        patch.height = height;
      }
      node.setAttrs({ scaleX: 1, scaleY: 1, skewX: 0, skewY: 0 });
      // Undo the live counter scale from onTransform. React owns the width from here.
      ((node as Konva.Group).findOne("Text") as Konva.Text | undefined)?.setAttrs({ scaleX: 1 });
      // A degenerate transform can produce NaN. Never let that reach the store.
      if (!Object.values(patch).every((value) => Number.isFinite(value))) continue;
      patches[element.id] = patch;
    }
    useProjectStore.getState().patchElements(patches);
    useEditorUiStore.getState().setInteracting(false);
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
      onTransformStart={() => useEditorUiStore.getState().setInteracting(true)}
      onTransform={onTransform}
      onTransformEnd={commit}
    />
  );
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

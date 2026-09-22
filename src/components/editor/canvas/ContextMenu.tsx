"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { positionPopover, type Placement } from "@/lib/popover-position";
import { useEditorUiStore } from "@/store/editor-ui-store";
import { useProjectStore } from "@/store/project-store";
import { selectCurrentElements } from "@/store/selectors";
import { Icon } from "../../ui/Icon";
import { elementMenuEntries, pageMenuEntries, type MenuEntry } from "./context-menu-items";

/**
 * The right click menu. Opens where the pointer is, stays on screen, and
 * offers the actions that make sense for what was clicked.
 */
export function ContextMenu() {
  const menu = useEditorUiStore((s) => s.contextMenu);
  const close = useEditorUiStore((s) => s.closeContextMenu);
  const selectedIds = useProjectStore((s) => s.selectedIds);
  const elements = useProjectStore(selectCurrentElements);
  const ref = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<Placement | null>(null);

  const selected = elements.filter((el) => selectedIds.includes(el.id));

  useLayoutEffect(() => {
    if (!menu || !ref.current) {
      setPlacement(null);
      return;
    }
    const box = ref.current.getBoundingClientRect();
    const anchor = { top: menu.y, left: menu.x, right: menu.x, bottom: menu.y };
    setPlacement(positionPopover(anchor, { width: box.width, height: box.height }, { width: window.innerWidth, height: window.innerHeight }));
  }, [menu]);

  useEffect(() => {
    if (!menu) return;
    const onDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        close();
      }
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("wheel", close, { passive: true });
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("wheel", close);
    };
  }, [menu, close]);

  if (!menu || typeof document === "undefined") return null;

  const entries: MenuEntry[] = menu.elementId ? elementMenuEntries({ selected, point: menu.point }) : pageMenuEntries(menu.point);

  return createPortal(
    <div
      ref={ref}
      className="context-menu"
      role="menu"
      data-popover="true"
      style={{ top: placement?.top ?? menu.y, left: placement?.left ?? menu.x, visibility: placement ? "visible" : "hidden" }}
      onContextMenu={(event) => event.preventDefault()}
    >
      {entries.map((entry, index) =>
        entry.id === "divider" ? (
          <hr key={`divider-${index}`} className="context-menu__divider" />
        ) : (
          <button
            key={entry.id}
            type="button"
            role="menuitem"
            className={`context-menu__item ${entry.danger ? "context-menu__item--danger" : ""}`}
            disabled={entry.disabled}
            onClick={() => {
              close();
              entry.run();
            }}
          >
            <span className="context-menu__icon">{entry.icon ? <Icon name={entry.icon} size={16} /> : null}</span>
            <span className="grow">{entry.label}</span>
            {entry.shortcut ? <span className="small muted">{entry.shortcut}</span> : null}
          </button>
        ),
      )}
    </div>,
    document.body,
  );
}

"use client";
import { useEditorUiStore, type Tool } from "@/store/editor-ui-store";
import { Icon } from "../ui/Icon";
import type { IconName } from "../ui/icon-paths";

const TOOLS: { id: Tool; icon: IconName; label: string; hint: string }[] = [
  { id: "select", icon: "pointer", label: "Select", hint: "Select, move, resize and rotate (V)" },
  { id: "text", icon: "text", label: "Text", hint: "Add text (T)" },
  { id: "shapes", icon: "shapes", label: "Shapes", hint: "Add a shape" },
  { id: "upload", icon: "upload", label: "Upload", hint: "Import an image" },
];

/** The vertical tool bar on the left. */
export function ToolRail() {
  const tool = useEditorUiStore((s) => s.tool);
  const setTool = useEditorUiStore((s) => s.setTool);

  return (
    <nav className="rail" aria-label="Tools">
      {TOOLS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`rail__tool ${tool === item.id ? "rail__tool--active" : ""}`}
          title={item.hint}
          aria-pressed={tool === item.id}
          onClick={() => setTool(item.id)}
        >
          <Icon name={item.icon} size={20} />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

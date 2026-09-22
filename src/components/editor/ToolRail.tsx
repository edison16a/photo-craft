"use client";
import { useSettings } from "@/hooks/use-settings";
import { keyLabel } from "@/lib/keybinds";
import { useEditorUiStore, type Tool } from "@/store/editor-ui-store";
import { Icon } from "../ui/Icon";
import type { IconName } from "../ui/icon-paths";

const TOOLS: { id: Tool; icon: IconName; label: string; hint: string }[] = [
  { id: "select", icon: "pointer", label: "Select", hint: "Select, move, resize and rotate" },
  { id: "text", icon: "text", label: "Text", hint: "Add text" },
  { id: "shapes", icon: "shapes", label: "Shapes", hint: "Add a shape" },
  { id: "draw", icon: "pen", label: "Draw", hint: "Draw your own shape" },
  { id: "upload", icon: "upload", label: "Upload", hint: "Import an image" },
];

/** The vertical tool bar on the left. Each tip names the tool's key, when it has one. */
export function ToolRail() {
  const tool = useEditorUiStore((s) => s.tool);
  const setTool = useEditorUiStore((s) => s.setTool);
  const keybinds = useSettings().settings.keybinds;
  const hint = (item: (typeof TOOLS)[number]) => (keybinds[item.id] ? `${item.hint} (${keyLabel(keybinds[item.id] as string)})` : item.hint);

  return (
    <nav className="rail" aria-label="Tools">
      {TOOLS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`rail__tool ${tool === item.id ? "rail__tool--active" : ""}`}
          title={hint(item)}
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

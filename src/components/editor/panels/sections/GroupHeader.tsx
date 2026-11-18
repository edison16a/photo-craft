"use client";
/**
 * Heading for several selected elements: how many there are, or "Group"
 * when they are one group, with a button to group or ungroup them.
 */
import { groupAction } from "@/lib/groups";
import type { CanvasElement } from "@/model/types";
import { useProjectStore } from "@/store/project-store";
import { Icon } from "../../../ui/Icon";

interface GroupHeaderProps {
  elements: CanvasElement[];
}

/** The count or "Group" label and the matching group or ungroup button. */
export function GroupHeader({ elements }: GroupHeaderProps) {
  const ids = elements.map((el) => el.id);
  const action = groupAction(elements);
  const store = useProjectStore.getState;
  return (
    <div className="row row--between">
      <span style={{ fontWeight: 600 }}>{action === "ungroup" ? "Group" : `${elements.length} items`}</span>
      {action === "group" ? (
        <button type="button" className="btn btn--sm" title="Ctrl+G" onClick={() => store().groupElements(ids)}>
          <Icon name="group" size={16} />
          Group
        </button>
      ) : null}
      {action === "ungroup" ? (
        <button type="button" className="btn btn--sm" title="Ctrl+Shift+G" onClick={() => store().ungroupElements(ids)}>
          <Icon name="ungroup" size={16} />
          Ungroup
        </button>
      ) : null}
    </div>
  );
}

/**
 * Group and ungroup on the current page. Each one is a single undo step.
 */
import { groupInStack, normaliseGroups, splitIntoUnits, ungroupInStack } from "../../lib/groups";
import { createId } from "../../model/ids";
import { applyProjectChange, type Slice } from "../project-state";
import { findPage, withPageElements } from "../project-updates";

/** Actions that make and break groups. */
export interface GroupActions {
  /**
   * Puts the elements in one new group and selects all of them. Needs at
   * least two units. Members of earlier groups move into the new one.
   */
  groupElements: (ids: string[]) => void;
  /** Dissolves every group the elements belong to. The selection stays as it is. */
  ungroupElements: (ids: string[]) => void;
}

/** Builds the group actions for the store. */
export const createGroupSlice: Slice<GroupActions> = (set, get) => ({
  groupElements: (ids) => {
    const { project, currentPageId } = get();
    const page = project ? findPage(project, currentPageId) : undefined;
    if (!page) return;
    const wanted = new Set(ids);
    const members = page.elements.filter((element) => wanted.has(element.id));
    if (splitIntoUnits(members).length < 2) return;
    const memberIds = members.map((element) => element.id);
    const groupId = createId("grp");
    applyProjectChange(
      set,
      get,
      (current) =>
        withPageElements(current, currentPageId, (elements) => normaliseGroups(groupInStack(elements, memberIds, groupId))),
      { selectedIds: memberIds },
    );
  },

  ungroupElements: (ids) => {
    const { currentPageId } = get();
    applyProjectChange(set, get, (project) =>
      withPageElements(project, currentPageId, (elements) => ungroupInStack(elements, ids)),
    );
  },
});

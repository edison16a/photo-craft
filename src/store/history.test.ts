import { describe, expect, it } from "vitest";
import { emptyHistory, HISTORY_LIMIT, pushHistory, redoHistory, undoHistory } from "./history";

describe("history", () => {
  it("undoes and redoes in order", () => {
    let history = emptyHistory<number>();
    history = pushHistory(history, 1);
    history = pushHistory(history, 2);
    const undone = undoHistory(history, 3);
    expect(undone?.snapshot).toBe(2);
    expect(undone?.history.future).toEqual([3]);
    const redone = redoHistory(undone!.history, 2);
    expect(redone?.snapshot).toBe(3);
  });

  it("returns null when there is nothing to undo", () => {
    expect(undoHistory(emptyHistory<number>(), 1)).toBeNull();
    expect(redoHistory(emptyHistory<number>(), 1)).toBeNull();
  });

  it("drops the oldest step past the limit", () => {
    let history = emptyHistory<number>();
    for (let i = 0; i < HISTORY_LIMIT + 5; i += 1) history = pushHistory(history, i);
    expect(history.past.length).toBe(HISTORY_LIMIT);
    expect(history.past[0]).toBe(5);
  });

  it("clears redo when a new change is pushed", () => {
    let history = pushHistory(emptyHistory<number>(), 1);
    history = undoHistory(history, 2)!.history;
    history = pushHistory(history, 9);
    expect(history.future).toEqual([]);
  });
});

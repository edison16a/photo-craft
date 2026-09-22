import { describe, expect, it } from "vitest";
import { stripExtension } from "./files";

describe("stripExtension", () => {
  it("drops the last extension only", () => {
    expect(stripExtension("holiday.JPG")).toBe("holiday");
    expect(stripExtension("archive.tar.png")).toBe("archive.tar");
  });

  it("keeps names without an extension and dot files whole", () => {
    expect(stripExtension("photo")).toBe("photo");
    expect(stripExtension(".hidden")).toBe(".hidden");
  });
});

import { describe, expect, it } from "vitest";
import { fetchBackgroundRemovalStatus, removeImageBackground } from "./background-removal";

const TINY_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

function fakeFetch(status: number, body: unknown, ok = status < 400): typeof fetch {
  return (async () =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }) as Response & { ok: boolean }) as unknown as typeof fetch;
  void ok;
}

describe("background removal client", () => {
  it("returns the server status", async () => {
    const status = await fetchBackgroundRemovalStatus(fakeFetch(200, { available: true, model: "u2net" }));
    expect(status).toEqual({ available: true, model: "u2net" });
  });

  it("turns a failed status request into an unavailable result", async () => {
    const status = await fetchBackgroundRemovalStatus(fakeFetch(503, { error: "No Python." }));
    expect(status.available).toBe(false);
    expect(status.reason).toBe("No Python.");
  });

  it("reports an unreachable server", async () => {
    const failing = (async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    expect((await fetchBackgroundRemovalStatus(failing)).reason).toBe("Could not reach the server.");
  });

  it("throws the server's message when removal fails", async () => {
    await expect(removeImageBackground(TINY_PNG, fakeFetch(500, { error: "Worker crashed." }))).rejects.toThrow("Worker crashed.");
  });

  it("sends the image bytes with an image content type", async () => {
    let seen: RequestInit | undefined;
    const capture = (async (_url: string, init?: RequestInit) => {
      seen = init;
      return new Response(JSON.stringify({ error: "stop here" }), { status: 500 });
    }) as unknown as typeof fetch;
    await removeImageBackground(TINY_PNG, capture).catch(() => undefined);
    expect(seen?.method).toBe("POST");
    expect((seen?.headers as Record<string, string>)["content-type"]).toBe("image/png");
    expect(seen?.body).toBeInstanceOf(Blob);
  });
});

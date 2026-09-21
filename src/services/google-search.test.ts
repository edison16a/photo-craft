import { describe, expect, it } from "vitest";
import {
  buildGoogleImagesPopupUrl,
  buildGoogleSearchApiUrl,
  hasGoogleCredentials,
  parseGoogleSearchResponse,
  searchGoogleImages,
} from "./google-search";

const credentials = { apiKey: "my key", searchEngineId: "cx&id" };

const sampleResponse = {
  queries: { nextPage: [{ startIndex: 11 }] },
  items: [
    {
      title: "Red bike",
      link: "https://example.com/bike.png",
      image: {
        contextLink: "https://example.com/page",
        thumbnailLink: "https://thumbs.example.com/bike.jpg",
        width: 800,
        height: 600,
      },
    },
    { title: "No link at all", image: { width: 10, height: 10 } },
    { link: "https://example.com/bare.jpg" },
    { link: "https://example.com/bike.png", title: "Duplicate link" },
  ],
};

describe("buildGoogleSearchApiUrl", () => {
  it("encodes every parameter and defaults start to 1", () => {
    const url = new URL(buildGoogleSearchApiUrl(credentials, { query: "red bike & trailer" }));
    expect(url.origin + url.pathname).toBe("https://www.googleapis.com/customsearch/v1");
    expect(url.searchParams.get("key")).toBe("my key");
    expect(url.searchParams.get("cx")).toBe("cx&id");
    expect(url.searchParams.get("q")).toBe("red bike & trailer");
    expect(url.searchParams.get("searchType")).toBe("image");
    expect(url.searchParams.get("num")).toBe("10");
    expect(url.searchParams.get("start")).toBe("1");
    expect(url.searchParams.get("safe")).toBe("active");
    expect(url.searchParams.has("imgColorType")).toBe(false);
    expect(url.search).toContain("q=red+bike+%26+trailer");
  });

  it("adds the transparent filter and a custom start", () => {
    const url = new URL(buildGoogleSearchApiUrl(credentials, { query: "logo", start: 21, transparentOnly: true }));
    expect(url.searchParams.get("start")).toBe("21");
    expect(url.searchParams.get("imgColorType")).toBe("trans");
  });
});

describe("buildGoogleImagesPopupUrl", () => {
  it("builds a plain image search url", () => {
    expect(buildGoogleImagesPopupUrl("red bike", false)).toBe("https://www.google.com/search?tbm=isch&q=red%20bike");
  });

  it("adds the transparent flag", () => {
    expect(buildGoogleImagesPopupUrl("a/b", true)).toBe("https://www.google.com/search?tbm=isch&q=a%2Fb&tbs=ic:trans");
  });
});

describe("parseGoogleSearchResponse", () => {
  it("maps items and reads the next start", () => {
    const page = parseGoogleSearchResponse(sampleResponse);
    expect(page.nextStart).toBe(11);
    expect(page.results).toHaveLength(3);
    expect(page.results[0]).toEqual({
      id: "https://example.com/bike.png",
      title: "Red bike",
      imageUrl: "https://example.com/bike.png",
      thumbnailUrl: "https://thumbs.example.com/bike.jpg",
      width: 800,
      height: 600,
      sourceUrl: "https://example.com/page",
    });
    expect(page.results[1]).toEqual({
      id: "https://example.com/bare.jpg",
      title: "",
      imageUrl: "https://example.com/bare.jpg",
      thumbnailUrl: "https://example.com/bare.jpg",
      width: 0,
      height: 0,
      sourceUrl: "",
    });
    expect(page.results[2].id).toBe("https://example.com/bike.png#3");
  });

  it("copes with junk and with no next page", () => {
    expect(parseGoogleSearchResponse(null)).toEqual({ results: [] });
    expect(parseGoogleSearchResponse("nope")).toEqual({ results: [] });
    expect(parseGoogleSearchResponse({ items: "bad", queries: 4 })).toEqual({ results: [] });
    const page = parseGoogleSearchResponse({ items: [], queries: { request: [{ startIndex: 1 }] } });
    expect(page.nextStart).toBeUndefined();
  });
});

describe("searchGoogleImages", () => {
  it("returns parsed results on success", async () => {
    const calls: string[] = [];
    const fakeFetch: typeof fetch = async (input) => {
      calls.push(String(input));
      return new Response(JSON.stringify(sampleResponse), { status: 200 });
    };
    const page = await searchGoogleImages(credentials, { query: "red bike" }, fakeFetch);
    expect(page.results).toHaveLength(3);
    expect(page.nextStart).toBe(11);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("q=red+bike");
  });

  it("throws with the API error message when the response is not ok", async () => {
    const fakeFetch: typeof fetch = async () =>
      new Response(JSON.stringify({ error: { code: 403, message: "API key not valid." } }), { status: 403 });
    await expect(searchGoogleImages(credentials, { query: "x" }, fakeFetch)).rejects.toThrow("API key not valid.");
  });

  it("falls back to a status message when the error body is not JSON", async () => {
    const fakeFetch: typeof fetch = async () => new Response("<html>gateway</html>", { status: 502 });
    await expect(searchGoogleImages(credentials, { query: "x" }, fakeFetch)).rejects.toThrow("status 502");
  });
});

describe("hasGoogleCredentials", () => {
  it("needs both values to be non blank", () => {
    expect(hasGoogleCredentials({ googleApiKey: "", googleSearchEngineId: "" })).toBe(false);
    expect(hasGoogleCredentials({ googleApiKey: "k", googleSearchEngineId: "   " })).toBe(false);
    expect(hasGoogleCredentials({ googleApiKey: " ", googleSearchEngineId: "cx" })).toBe(false);
    expect(hasGoogleCredentials({ googleApiKey: "k", googleSearchEngineId: "cx" })).toBe(true);
  });
});

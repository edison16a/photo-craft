import { NextResponse } from "next/server";
import { getRemovalStatus, ImageError, removeBackground } from "@/server/background-remover";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Largest upload we hand to the worker. */
const MAX_BYTES = 25 * 1024 * 1024;

const NO_STORE = { "cache-control": "no-store" };

/** Reports whether background removal is set up on this server. */
export async function GET() {
  return NextResponse.json(getRemovalStatus(), { headers: NO_STORE });
}

/** Takes an image body and returns the same picture as a PNG without its background. */
export async function POST(request: Request) {
  const type = request.headers.get("content-type") ?? "";
  if (!type.startsWith("image/")) {
    return NextResponse.json({ error: "Send the image bytes with an image content type." }, { status: 415 });
  }
  const status = getRemovalStatus();
  if (!status.available) {
    return NextResponse.json({ error: status.reason ?? "Background removal is not available." }, { status: 503, headers: NO_STORE });
  }
  const tooLarge = { error: "That image is too large. Keep it under 25 MB." };
  // Refuse by the declared length first so a huge upload is not buffered for nothing.
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BYTES) return NextResponse.json(tooLarge, { status: 413 });
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.length === 0) return NextResponse.json({ error: "The image was empty." }, { status: 400 });
  if (bytes.length > MAX_BYTES) return NextResponse.json(tooLarge, { status: 413 });
  try {
    const png = await removeBackground(bytes);
    return new Response(new Blob([png as BlobPart]), { headers: { "content-type": "image/png", ...NO_STORE } });
  } catch (error) {
    if (error instanceof ImageError) {
      return NextResponse.json({ error: "That file could not be read as an image." }, { status: 422 });
    }
    const message = error instanceof Error ? error.message : "Background removal failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

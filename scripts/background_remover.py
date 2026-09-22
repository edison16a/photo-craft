#!/usr/bin/env python3
"""Background removal worker for Photo Craft.

Runs as a long lived child process of the Next.js server so the model is
loaded once. It talks a tiny binary protocol over stdin and stdout:

    request:  4 byte big endian length, then that many image bytes
    response: 1 status byte (0 ok, 1 error), 4 byte big endian length,
              then a PNG (ok) or a UTF-8 message (error)

Before the first request the worker prints one JSON line to stdout:
{"ready": true, "model": "u2net"} or {"error": "..."}.

Run with --check to print a JSON line saying whether rembg is installed,
without loading anything heavy.
"""
import importlib.util
import json
import os
import struct
import sys

DEFAULT_MODEL = "u2net"


def check() -> int:
    """Reports whether the rembg package can be imported. Fast, no model load."""
    installed = importlib.util.find_spec("rembg") is not None
    print(json.dumps({"ok": installed, "python": sys.version.split()[0]}), flush=True)
    return 0 if installed else 2


def read_exact(stream, size: int) -> bytes:
    """Reads exactly size bytes or returns an empty value at end of stream."""
    chunks = []
    remaining = size
    while remaining > 0:
        chunk = stream.read(remaining)
        if not chunk:
            return b""
        chunks.append(chunk)
        remaining -= len(chunk)
    return b"".join(chunks)


def respond(stream, status: int, payload: bytes) -> None:
    """Writes one framed response."""
    stream.write(bytes([status]) + struct.pack(">I", len(payload)) + payload)
    stream.flush()


def serve() -> int:
    """Loads the model, announces readiness, then answers requests until stdin closes."""
    stdin = sys.stdin.buffer
    stdout = sys.stdout.buffer
    model = os.environ.get("PHOTO_CRAFT_BG_MODEL", DEFAULT_MODEL)
    try:
        from rembg import new_session, remove
        session = new_session(model)
    except Exception as error:  # noqa: BLE001, report anything to the server
        print(json.dumps({"error": f"{type(error).__name__}: {error}"}), flush=True)
        return 2
    print(json.dumps({"ready": True, "model": model}), flush=True)

    while True:
        header = read_exact(stdin, 4)
        if not header:
            return 0
        (length,) = struct.unpack(">I", header)
        data = read_exact(stdin, length)
        if len(data) != length:
            return 0
        try:
            result = remove(data, session=session)
            respond(stdout, 0, result)
        except Exception as error:  # noqa: BLE001, one bad image must not kill the worker
            respond(stdout, 1, f"{type(error).__name__}: {error}".encode("utf-8"))


if __name__ == "__main__":
    sys.exit(check() if "--check" in sys.argv[1:] else serve())

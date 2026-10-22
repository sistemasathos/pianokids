#!/usr/bin/env python3
"""Generate PianoKids PNG icons without Pillow."""

from __future__ import annotations

import math
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "icons"


def chunk(tag: bytes, data: bytes) -> bytes:
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)


def write_png(path: Path, w: int, h: int, rgba) -> None:
    raw = bytearray()
    for y in range(h):
        raw.append(0)
        for x in range(w):
            raw.extend(rgba(x, y))
    ihdr = struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(bytes(raw), 9)) + chunk(b"IEND", b"")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(png)


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def mix(c0, c1, t):
    return tuple(int(lerp(c0[i], c1[i], t)) for i in range(3)) + (255,)


def in_round_rect(x, y, l, t, r, b, rad) -> bool:
    if l + rad <= x <= r - rad and t <= y <= b:
        return True
    if t + rad <= y <= b - rad and l <= x <= r:
        return True
    corners = (
        (l + rad, t + rad),
        (r - rad, t + rad),
        (l + rad, b - rad),
        (r - rad, b - rad),
    )
    for cx, cy in corners:
        if (x - cx) ** 2 + (y - cy) ** 2 <= rad * rad and (
            (x <= l + rad or x >= r - rad) and (y <= t + rad or y >= b - rad)
        ):
            return True
    return False


def in_rect(x, y, l, t, r, b) -> bool:
    return l <= x <= r and t <= y <= b


def in_round_rect2(x, y, l, t, r, b, rad) -> bool:
    nx = min(max(x, l + rad), r - rad)
    ny = min(max(y, t + rad), b - rad)
    if l + rad <= x <= r - rad and t <= y <= b:
        return True
    if t + rad <= y <= b - rad and l <= x <= r:
        return True
    return (x - nx) ** 2 + (y - ny) ** 2 <= rad * rad


def star(px, py, cx, cy, r_out, r_in) -> bool:
    ang = math.atan2(py - cy, px - cx) + math.pi / 2
    dist = math.hypot(px - cx, py - cy)
    a = (ang / (2 * math.pi)) * 5
    a -= math.floor(a)
    # interpolate between outer and inner radius
    if a > 0.5:
        a = 1 - a
    t = a * 2
    rad = lerp(r_out, r_in, t)
    return dist <= rad * 1.05


def make_icon(size: int, padded: bool):
    peach = (255, 180, 162)
    lavender = (203, 182, 245)
    cream = (255, 248, 240)
    ink = (59, 51, 85)
    sun = (255, 209, 92)
    margin = int(size * 0.12) if padded else int(size * 0.04)
    rad = int(size * 0.18)

    def px(x, y):
        if not in_round_rect2(x, y, margin, margin, size - 1 - margin, size - 1 - margin, rad):
            return (0, 0, 0, 0) if padded else mix(peach, lavender, y / size)
        t = y / size
        base = mix(peach, lavender, t * 0.65)
        # keys
        key_t = int(size * 0.34)
        key_b = int(size * 0.78)
        key_w = int(size * 0.16)
        gap = int(size * 0.035)
        start = int(size * 0.22)
        for i in range(3):
            l = start + i * (key_w + gap)
            r = l + key_w
            if in_round_rect2(x, y, l, key_t, r, key_b, int(size * 0.04)):
                return cream
        # black keys
        bk_w = int(size * 0.1)
        bk_h = int(size * 0.22)
        for i in (0, 1):
            l = start + key_w - bk_w // 3 + i * (key_w + gap)
            if in_rect(x, y, l, key_t, l + bk_w, key_t + bk_h):
                return ink + (255,)
        # star
        if star(x, y, int(size * 0.78), int(size * 0.22), size * 0.1, size * 0.045):
            return sun + (255,)
        return base

    return px


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    write_png(OUT / "icon-512.png", 512, 512, make_icon(512, False))
    write_png(OUT / "icon-192.png", 192, 192, make_icon(192, False))
    write_png(OUT / "apple-touch-icon.png", 180, 180, make_icon(180, False))
    write_png(OUT / "maskable-512.png", 512, 512, make_icon(512, True))
    write_png(ROOT / "public" / "favicon.png", 64, 64, make_icon(64, False))
    print("icons written")


if __name__ == "__main__":
    main()

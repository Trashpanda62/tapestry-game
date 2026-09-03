# -*- coding: utf-8 -*-
"""Precompute per-image statistics for the shop's hero-selection rule.

The card wants the best photograph of a product, and the imported media sets mix real
photography with size charts, care diagrams and yarn-weight icons. Ranking on
resolution alone put a 540x339 near-black size chart on the Winter Alpaca Heavy Mini
Crew Sock and a Craft Yarn Council weight symbol ("4") on Brights Mix Luna Paints Yarn,
because in both cases the diagram was stored larger than the photograph.

Telling those apart needs pixels, and the build is pure Node with no image decoder. So
the statistics are computed here, offline, and committed as data:
  scripts/generate-catalog.mjs reads src/image-stats.json and never decodes anything.

One signal does it: the Hasler-Susstrunk colorfulness metric. Measured across this
catalogue the two known diagrams score 1.69 and 0.12 while real product photographs
score 8.07 to 85.25 — including the deliberately grey ones, which is the case that
matters, since a black sock on a white background is the photograph most likely to be
mistaken for line art.

A fraction-of-pure-black-and-white measure was tried alongside it and discarded: the
size chart scored 0.663 and a genuine sock photo 0.532, so it separated nothing.

Run from the repo root when assets/products/ changes:
  python scripts/build-image-stats.py
"""
import json
import os
from glob import glob

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "src", "image-stats.json")
SAMPLE = 96  # Downsample edge. The statistics are global, so full resolution is waste.


def stats_for(path):
    image = Image.open(path)
    width, height = image.size
    small = image.convert("RGB").resize((SAMPLE, SAMPLE), Image.BILINEAR)
    pixels = list(small.getdata())
    count = float(len(pixels))

    rg_values = []
    yb_values = []
    for red, green, blue in pixels:
        rg_values.append(red - green)
        yb_values.append(0.5 * (red + green) - blue)

    def mean(values):
        return sum(values) / count

    def sigma(values, average):
        return (sum((value - average) ** 2 for value in values) / count) ** 0.5

    rg_mean, yb_mean = mean(rg_values), mean(yb_values)
    rg_sigma, yb_sigma = sigma(rg_values, rg_mean), sigma(yb_values, yb_mean)
    colorfulness = (rg_sigma ** 2 + yb_sigma ** 2) ** 0.5 + 0.3 * (rg_mean ** 2 + yb_mean ** 2) ** 0.5

    return {"w": width, "h": height, "colorfulness": round(colorfulness, 2)}


def main():
    files = sorted(glob(os.path.join(ROOT, "assets", "products", "*", "*.webp")))
    table = {}
    for path in files:
        key = os.path.relpath(path, ROOT).replace(os.sep, "/")
        try:
            table[key] = stats_for(path)
        except Exception as error:  # a corrupt asset must not take the build down
            print("skip %s: %s" % (key, error))
    with open(OUT, "w", encoding="utf-8", newline="\n") as handle:
        json.dump(table, handle, indent=0, sort_keys=True)
        handle.write("\n")
    print("wrote %d image stats -> %s" % (len(table), OUT))


if __name__ == "__main__":
    main()

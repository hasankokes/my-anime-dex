"""Colour app logo (from assets/images/splash-lightcover.png) with its white background removed.

Only the white connected to the image border is removed (flood fill), so the cream "DEX" fill inside the
black outline is kept. Edge pixels get colour-to-alpha against white, so there's no white fringe on dark backgrounds.

usage: .venv/bin/python captures/make_logo.py  → remotion/public/brand/logo_color.png
"""
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
src = ROOT.parent / "assets/images/splash-lightcover.png"
dst = ROOT / "remotion/public/brand/logo_color.png"

im = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
# crop around the logo (it sits centred on the 1242×2436 splash)
ys, xs = np.where((255 - im).max(axis=2) > 24)
y0, y1, x0, x1 = ys.min() - 12, ys.max() + 12, xs.min() - 12, xs.max() + 12
im = im[y0:y1, x0:x1]

near_white = (255 - im).max(axis=2) < 40
lab, _ = ndimage.label(near_white)
border = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
bg = np.isin(lab, border[border > 0])

alpha = np.ones(im.shape[:2], np.float32)
alpha[bg] = 0.0
band = ndimage.binary_dilation(bg, iterations=3) & ~bg
a = (255 - im[band]).max(axis=1) / 255.0
a = np.clip(a * 1.15, 0, 1)
rgb = im.copy()
safe = np.maximum(a, 1e-3)[:, None]
rgb[band] = np.clip((im[band] - 255 * (1 - safe)) / safe, 0, 255)
alpha[band] = a

out = np.dstack([rgb, alpha * 255]).astype(np.uint8)
Image.fromarray(out, "RGBA").save(dst)
print(dst, out.shape)

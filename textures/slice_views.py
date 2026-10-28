# Cuts one building drawn on a 2x2 sheet (cells with dark borders on white, the building on its own yard plate)
# into textures/<name>_<way>.png and adds them to sprites.json. Only the two front views are used: the sheet's
# back views still show the gate, so a road behind gets the front view next to it (ne → se, nw → sw).
# The yard plate fills FOOT of the tile, its bottom corner on the tile's bottom vertex.
# Usage: python slice_views.py <sheet image> <name> <sw cell> <se cell>   (cells 0-3, row by row)
import json, sys
import numpy as np
from PIL import Image
from scipy import ndimage

OUT = 'E:/Grad/textures/'
FOOT = 0.94
im = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(int)
name, cells = sys.argv[2], {'sw': int(sys.argv[3]), 'se': int(sys.argv[4])}
H, W = im.shape[:2]

def cut(c):
    r, k = divmod(c, 2)
    cell = im[int(r * H / 2) + 10:int((r + 1) * H / 2) - 10, int(k * W / 2) + 10:int((k + 1) * W / 2) - 10]  # inside the borders
    lo, hi = cell.min(2), cell.max(2)
    lab, _ = ndimage.label((lo > 215) & (hi - lo < 25))
    edge = set(lab[0]) | set(lab[-1]) | set(lab[:, 0]) | set(lab[:, -1])
    fg = ~np.isin(lab, [l for l in edge if l])
    fl, n = ndimage.label(fg)
    sizes = ndimage.sum(fg, fl, range(1, n + 1))
    fg = ndimage.binary_erosion(np.isin(fl, [j + 1 for j, s in enumerate(sizes) if s > sizes.max() * 0.02]))
    ys, xs = np.nonzero(fg)
    return Image.fromarray(np.dstack([cell, np.where(fg, 255, 0)]).astype(np.uint8), 'RGBA').crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))

meta = json.load(open(OUT + 'sprites.json'))
for way, c in cells.items():
    img = cut(c)
    a = np.asarray(img)[:, :, 3] > 0
    ys, xs = np.nonzero(a)
    low = ys > ys.max() - (ys.max() - ys.min()) * 0.3  # the plate is the widest part near the bottom
    k = 256 * FOOT / (xs[low].max() - xs[low].min())
    bx, by = np.median(xs[ys >= ys.max() - 2]), ys.max()
    img = img.resize((round(img.width * k), round(img.height * k)), Image.LANCZOS)
    m = [img.width, img.height, round(bx * k), round(by * k + (1 - FOOT) * 64)]
    for w in (way, {'sw': 'nw', 'se': 'ne'}[way]):
        img.save(OUT + f'{name}_{w}.png'); meta[f'{name}_{w}'] = m
    print(name, way, m)
json.dump(meta, open(OUT + 'sprites.json', 'w'), separators=(',', ':'))

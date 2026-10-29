# Cuts a sheet of growth stages of one tile (cells with dark borders on white) into textures/<prefix>_<n>.png,
# n = 1, 2, ... in the order given, and adds them to sprites.json. Every stage gets the same scale (the plate's width
# is WIDTH px, like the old one-picture farm), so the stages swap without a jump. The plate is drawn steeper than the
# game's 2:1 tiles and has a side wall: each picture is squashed to 2:1 and stands on the bottom corner of the plate's
# top (SIDE above its lowest point), so neighbouring fields meet edge to edge and the tiles in front hide the wall.
# Usage: python slice_stages.py <sheet image> <prefix> <cols> <rows> <cell of stage 1> <cell of stage 2> ...  (cells row by row from 0)
import json, sys
import numpy as np
from PIL import Image
from scipy import ndimage

OUT = 'E:/Grad/textures/'
WIDTH = 250
SIDE = 0.052  # the plate's side wall, as a share of its width (measured on the farm sheet)
im = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(int)
prefix, cols, rows, order = sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), [int(c) for c in sys.argv[5:]]
H, W = im.shape[:2]

def cut(c):
    r, k = divmod(c, cols)
    cell = im[int(r * H / rows) + 6:int((r + 1) * H / rows) - 6, int(k * W / cols) + 6:int((k + 1) * W / cols) - 6]  # inside the borders
    lo, hi = cell.min(2), cell.max(2)
    lab, _ = ndimage.label((lo > 215) & (hi - lo < 25))
    edge = set(lab[0]) | set(lab[-1]) | set(lab[:, 0]) | set(lab[:, -1])
    fg = ~np.isin(lab, [l for l in edge if l])
    fl, n = ndimage.label(fg)
    sizes = ndimage.sum(fg, fl, range(1, n + 1))
    fg = ndimage.binary_erosion(np.isin(fl, [j + 1 for j, s in enumerate(sizes) if s > sizes.max() * 0.02]))
    pale = (lo > 200) & (hi - lo < 40)  # white background caught between grass blades: peeled off from the outside in
    for _ in range(4): fg &= ~(pale & ~ndimage.binary_erosion(fg))
    ys, xs = np.nonzero(fg)
    return Image.fromarray(np.dstack([cell, np.where(fg, 255, 0)]).astype(np.uint8), 'RGBA').crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))

stages = [cut(c) for c in order]
k = WIDTH / max(s.width for s in stages)  # one scale for all, from the widest stage (the plate is the widest part)
def corners(img):
    a = np.asarray(img)[:, :, 3] > 0
    ys, xs = np.nonzero(a)
    bx, by = np.median(xs[ys >= ys.max() - 2]), ys.max()  # the plate's bottom corner (under its wall)
    return bx, by, np.nonzero(a[:, 2])[0].max()  # and the bottom of the wall at the plate's left corner
# the plate's lower edges should fall 1 in 2, like a tile's; one squash for all stages, so they don't jump
squash = float(np.median([0.5 / ((by - left) / (bx - 2)) for bx, by, left in map(corners, stages)]))
meta = json.load(open(OUT + 'sprites.json'))
for n, img in enumerate(stages, 1):
    bx, by, _ = corners(img)
    img = img.resize((round(img.width * k), round(img.height * k * squash)), Image.LANCZOS)
    meta[f'{prefix}_{n}'] = [img.width, img.height, round(bx * k), round(by * k * squash - SIDE * img.width)]
    img.save(OUT + f'{prefix}_{n}.png')
    print(prefix, n, meta[f'{prefix}_{n}'], 'squash', round(squash, 3))
json.dump(meta, open(OUT + 'sprites.json', 'w'), separators=(',', ':'))

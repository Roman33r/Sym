# Cuts a top-down road sheet (4x4 square tiles with dark borders, white gaps) into isometric tiles
# textures/<prefix>_<mask>.png for all 16 neighbour masks, and adds them to sprites.json. Which sides a square joins
# is read from it (road surface at the middle of a side); every square also gives its 90-degree turns, so a few
# shapes cover all 16. A square's RIGHT, BOTTOM, LEFT, TOP become the diamond's SE, SW, NW, NE sides; mask bits are in
# the game's neighbour order: 1 NW (x-1), 2 SE (x+1), 4 NE (y-1), 8 SW (y+1).
# Usage: python slice_square_roads.py <sheet image> <prefix>
import json, sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

OUT = 'E:/Grad/textures/'
img = Image.open(sys.argv[1]).convert('RGB'); prefix = sys.argv[2]
A = np.asarray(img).astype(int)
dark = A.max(2) < 90  # the tiles' outlines
SIDE = {'right': 2, 'bottom': 8, 'left': 1, 'top': 4}

def squares():  # the boxes inside each tile's dark border, row by row
    lab, n = ndimage.label(~dark & (A.min(2) < 245))
    boxes = []
    for sl in ndimage.find_objects(lab):
        h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        if h > A.shape[0] / 6 and w > A.shape[1] / 6 and 0.8 < h / w < 1.25: boxes.append(sl)
    return sorted(boxes, key=lambda b: (round(b[0].start / (A.shape[0] / 8)), b[1].start))

def road(px):  # cobble or asphalt: grey, little colour; the sidewalk is warm beige
    return (px.max(-1) - px.min(-1) < 22) & (px.mean(-1) < 200)

def mask_of(sq):
    n = sq.shape[0]; m = 0
    pts = {'right': (n * 0.5, n * 0.93), 'bottom': (n * 0.93, n * 0.5), 'left': (n * 0.5, n * 0.07), 'top': (n * 0.07, n * 0.5)}
    for side, (y, x) in pts.items():
        y, x = int(y), int(x)
        if road(sq[y - 4:y + 5, x - 4:x + 5]).mean() > 0.5: m |= SIDE[side]
    return m

TURN = lambda m: (m & 4) >> 1 | (m & 2) << 2 | (m & 8) >> 3 | (m & 1) << 2  # turning a square 90 degrees clockwise: top→right→bottom→left→top

def iso(sq):  # a square seen from above → the 256x128 diamond (rendered twice as big, then scaled down)
    n = sq.shape[0]; s = Image.fromarray(sq.astype(np.uint8))
    W2, H2 = 512, 256
    # output (X, Y) → square (x, y): u - v = X / 256 - 1, u + v = Y / 128
    coeffs = (n / W2, n / H2, -n / 2, -n / W2, n / H2, n / 2)
    out = s.transform((W2, H2), Image.AFFINE, coeffs, resample=Image.BICUBIC).resize((256, 128), Image.LANCZOS).convert('RGBA')
    d = Image.new('L', (256, 128), 0); ImageDraw.Draw(d).polygon([(128, 0), (256, 64), (128, 128), (0, 64)], fill=255)
    out.putalpha(d)
    return out

found = {}
for sl in squares():
    sq = A[sl]
    m = max(6, sq.shape[0] // 60); sq = sq[m:-m, m:-m]  # inside the border
    k = mask_of(sq)
    for turn in range(4):  # the square and its three turns
        if k not in found: found[k] = iso(sq)
        sq = np.rot90(sq, -1); k = TURN(k)
meta = json.load(open(OUT + 'sprites.json'))
for k, t in found.items():
    t.save(OUT + f'{prefix}_{k}.png'); meta[f'{prefix}_{k}'] = [256, 128, 128, 128]
json.dump(meta, open(OUT + 'sprites.json', 'w'), separators=(',', ':'))
print(prefix, 'masks:', sorted(found), 'missing:', sorted(set(range(16)) - set(found)))

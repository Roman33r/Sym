# Cuts a sheet of dirt-path tiles (6 columns x 3 rows, white background) into textures/path_<mask>.png: only the
# dirt is kept (transparent elsewhere), so it lies on the map's own grass. Which neighbours a tile joins is read
# from the picture: dirt at the midpoint of a diamond edge means an arm that way. Mask bits are in the game's
# neighbour order: 1 NW (x-1), 2 SE (x+1), 4 NE (y-1), 8 SW (y+1). A shape missing from the sheet is taken
# mirrored when that gives it; the game builds the rest from the crossing's arms.
# Usage: python slice_paths.py <sheet image>
import json, sys
import numpy as np
from PIL import Image, ImageDraw, ImageOps
from scipy import ndimage

OUT = 'E:/Grad/textures/'
COLS, ROWS = 6, 3
im = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(int)
H, W = im.shape[:2]
cw, ch = W / COLS, H / ROWS
mask_d = Image.new('L', (256, 128), 0)
ImageDraw.Draw(mask_d).polygon([(128, 0), (256, 64), (128, 128), (0, 64)], fill=255)
diamond = np.asarray(mask_d) > 0
MID = {1: (64, 32), 2: (192, 96), 4: (192, 32), 8: (64, 96)}  # edge midpoints in a 256x128 tile
MIRROR = lambda m: (m & 1) << 2 | (m & 4) >> 2 | (m & 2) << 2 | (m & 8) >> 2

def tile(r, c):
    cell = im[int(r * ch):int((r + 1) * ch), int(c * cw):int((c + 1) * cw)]
    lo, hi = cell.min(2), cell.max(2)
    lab, _ = ndimage.label((lo > 205) & (hi - lo < 30))
    edge = set(lab[0]) | set(lab[-1]) | set(lab[:, 0]) | set(lab[:, -1])
    fg = ~np.isin(lab, [l for l in edge if l])
    ys, xs = np.nonzero(fg)
    xl, xr = xs.min(), xs.max()
    yl = np.median(ys[xs <= xl + 2])  # the left vertex of the top diamond (the slab hangs below it)
    dw = xr - xl
    m = dw * 0.02  # a little inside, past the outline
    box = (int(xl + m), int(yl - dw / 4 + m / 2), int(xr - m), int(yl + dw / 4 - m / 2))
    return Image.fromarray(cell.astype(np.uint8)).crop(box).resize((256, 128), Image.LANCZOS)

def dirt(img):  # alpha from how much redder than green a pixel is: brown dirt in, grass out, soft edge
    a = np.asarray(img).astype(int)
    d = a[:, :, 0] - a[:, :, 1]
    alpha = np.clip((d + 5) / 25, 0, 1) * diamond
    alpha = ndimage.uniform_filter(alpha, 2)
    return np.dstack([a, alpha * 255]).astype(np.uint8), alpha

def shape(alpha):
    m = 0
    for bit, (x, y) in MID.items():
        px, py = int(x + (128 - x) * 0.25), int(y + (64 - y) * 0.25)
        if alpha[py - 3:py + 4, px - 3:px + 4].mean() > 0.5: m |= bit
    return m

found = {}
for r in range(ROWS):
    for c in range(COLS):
        rgba, alpha = dirt(tile(r, c))
        if alpha.mean() < 0.01: continue  # plain grass
        m = shape(alpha)
        if m not in found: found[m] = Image.fromarray(rgba, 'RGBA')
for m, img in list(found.items()):
    if MIRROR(m) not in found: found[MIRROR(m)] = ImageOps.mirror(img)
meta = json.load(open(OUT + 'sprites.json'))
for m, img in found.items():
    img.save(OUT + f'path_{m}.png')
    meta[f'path_{m}'] = [256, 128, 128, 128]
json.dump(meta, open(OUT + 'sprites.json', 'w'), separators=(',', ':'))
print('masks:', sorted(found), 'missing:', sorted(set(range(16)) - set(found)))

# Cuts one building drawn on a 2x2 sheet (cells with dark borders on white, the building on its own yard plate)
# into textures/<name>_<way>.png and adds them to sprites.json. With only the two front views given, a road behind
# gets the front view next to it (ne → se, nw → sw); a sheet whose back views hide the gate can give those too.
# The yard plate is fitted onto FOOT of the tile, squashed to 1 in 2 edges, standing on the bottom corner of its top.
# Usage: python slice_views.py <sheet image> <name> <sw cell> <se cell> [<ne cell> <nw cell>] [--grid N or CxR] [--wall px]
#   (cells row by row from 0, 2 x 2 by default; ~n is cell n mirrored, for a view drawn only from one side; white
#   margins around the grid's frame are cut off first)
import json, sys
import numpy as np
from PIL import Image
from scipy import ndimage

OUT = 'E:/Grad/textures/'
FOOT = 0.96
args = sys.argv[1:]
g = args.pop(args.index('--grid') + 1) if '--grid' in args else '2'
if '--grid' in args: args.remove('--grid')
NC, NR = (int(v) for v in g.split('x')) if 'x' in g else (int(g), int(g))
WALL = int(args.pop(args.index('--wall') + 1)) if '--wall' in args else None  # one wall for several runs (growth stages)
if '--wall' in args: args.remove('--wall')
im = np.asarray(Image.open(args[0]).convert('RGB')).astype(int)
dark = im.max(2) < 90; rows = np.nonzero(dark.mean(1) > 0.5)[0]  # the grid's outer frame: its top and bottom lines,
if len(rows): cols = np.nonzero(dark[rows.min()])[0]; im = im[rows.min():rows.max() + 1, cols.min():cols.max() + 1]  # and how far the top one runs
name, cells = args[1], dict(zip(['sw', 'se', 'ne', 'nw'], args[2:6]))
H, W = im.shape[:2]

def cut(c):
    if c.startswith('~'): return cut(c[1:]).transpose(Image.FLIP_LEFT_RIGHT)
    r, k = divmod(int(c), NC)
    cell = im[int(r * H / NR) + 10:int((r + 1) * H / NR) - 10, int(k * W / NC) + 10:int((k + 1) * W / NC) - 10]  # inside the borders
    lo, hi = cell.min(2), cell.max(2)
    lab, _ = ndimage.label((lo > 215) & (hi - lo < 25))
    edge = set(lab[0]) | set(lab[-1]) | set(lab[:, 0]) | set(lab[:, -1])
    fg = ~np.isin(lab, [l for l in edge if l])
    fl, n = ndimage.label(fg)
    sizes = ndimage.sum(fg, fl, range(1, n + 1))
    boxes = ndimage.find_objects(fl)  # a bit of the cell's frame is a long thin strip: not part of the building
    fg = ndimage.binary_erosion(np.isin(fl, [j + 1 for j, s in enumerate(sizes) if s > sizes.max() * 0.02 and boxes[j][0].stop - boxes[j][0].start > 12]))
    ys, xs = np.nonzero(fg)
    return Image.fromarray(np.dstack([cell, np.where(fg, 255, 0)]).astype(np.uint8), 'RGBA').crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))

def plate(img):
    # The yard plate under the building: its bottom corner (bx, by), its width across the bottom part of the picture,
    # how steep its lower edges fall (the sheet draws them steeper than the game's 1 in 2) and its wall's thickness
    # (from the bottom outline up to the dark outline of its top).
    a = np.asarray(img)[:, :, 3] > 128
    ys, xs = np.nonzero(a)
    by = ys.max(); bx = int(np.median(xs[ys >= by - 2]))
    band = ys > by - (by - ys.min()) * 0.6  # low enough to hold the plate's side corners, even under a flat farm
    x0, x1 = xs[band].min(), xs[band].max()
    corner = lambda x: np.nonzero(a[:, x])[0].max()
    slope = ((by - corner(x0)) / (bx - x0) + (by - corner(x1)) / (x1 - bx)) / 2
    lum = np.asarray(img.convert('L')).astype(int)[:, bx]
    y = by
    while y > 0 and lum[y] < 90: y -= 1   # the bottom outline
    while y > 0 and lum[y] >= 90: y -= 1  # the wall
    return bx, by, x1 - x0, slope, by - y
meta = json.load(open(OUT + 'sprites.json'))
views = {way: cut(c) for way, c in cells.items()}
geo = {way: plate(img) for way, img in views.items()}
# all views of a building are drawn at one scale: the narrowest plate is the one no jar or crate sticks out of
ref = min(geo.values(), key=lambda g: g[2]); width, slope, wall = ref[2], ref[3], WALL if WALL is not None else min(ref[4], round(ref[2] * 0.065))  # a dock or steps can pass for a thicker wall
kx = 256 * FOOT / width   # the plate's width onto FOOT of the tile's
ky = kx * 0.5 / slope     # and its edges onto 1 in 2
for way, img in views.items():
    bx, by = geo[way][:2]
    img = img.resize((round(img.width * kx), round(img.height * ky)), Image.LANCZOS)
    m = [img.width, img.height, round(bx * kx), round((by - wall) * ky + (1 - FOOT) * 64)]  # the top's bottom corner on the tile's
    for w in ([way] if len(cells) == 4 else [way, {'sw': 'nw', 'se': 'ne'}[way]]):
        img.save(OUT + f'{name}_{w}.png'); meta[f'{name}_{w}'] = m
    print(name, way, m)
print(name, 'plate', width, 'px, slope', round(slope, 3), 'wall', wall)
json.dump(meta, open(OUT + 'sprites.json', 'w'), separators=(',', ':'))

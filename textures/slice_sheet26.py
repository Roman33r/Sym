# Cuts the mixed sheet (4 columns: rows 1-3 asphalt, 4-6 paths (skipped), 7-9 lake shores, then street props) into
# textures. Rows touch each other, so tiles are found by their widest line (the diamond's left and right vertices).
# Roads: road_<mask>.png for every neighbour mask the tiles show (asphalt at an edge midpoint = an arm that way),
# mirrored where that gives a missing one; road_b (straight along x) and road_one (lone piece) are replaced too,
# so the game builds the remaining shapes in the same style. Shores: shore_<edge>.png per side (land on that edge)
# and water.png; the game lays the sides a lake tile needs over the water. Props: veh_bus_ne/nw (the bus from
# behind), pole, manhole, puddle, hydrant, lamp with anchors for where they stand on a tile.
# Usage: python slice_sheet26.py <sheet image>
import json, sys
import numpy as np
from PIL import Image, ImageDraw, ImageOps
from scipy import ndimage

OUT = 'E:/Grad/textures/'
img = Image.open(sys.argv[1]).convert('RGB')
A = np.asarray(img).astype(int)
lo, hi = A.min(2), A.max(2)
FG = ~((lo > 215) & (hi - lo < 25))
COLS = [(9, 159), (175, 325), (342, 491), (508, 656)]
dmask = Image.new('L', (256, 128), 0); ImageDraw.Draw(dmask).polygon([(128, 0), (256, 64), (128, 128), (0, 64)], fill=255)
DIAMOND = np.asarray(dmask)
MID = {1: (64, 32), 2: (192, 96), 4: (192, 32), 8: (64, 96)}  # NW, SE, NE, SW edge midpoints in a 256x128 tile
MIRROR = lambda m: (m & 1) << 2 | (m & 4) >> 2 | (m & 2) << 2 | (m & 8) >> 2

def rows_of(x0, x1):
    col = FG[:582, x0:x1]
    left = np.array([np.argmax(r) if r.any() else 999 for r in col]); right = np.array([len(r) - np.argmax(r[::-1]) if r.any() else -1 for r in col])
    w = right - left
    peaks = [y for y in range(2, 580) if w[y] >= w[max(0, y - 6):y + 7].max() and w[y] > 120]
    out = []
    for y in peaks:
        if not out or y - out[-1][-1] > 10: out.append([y])
        else: out[-1].append(y)
    return [(int(np.mean(r)), x0 + int(np.median(left[r])), x0 + int(np.median(right[r]))) for r in out]

def tile(r, c, inset=0.025):  # the top diamond of row r, column c, as a 256x128 image with a diamond alpha
    y, xl, xr = rows_of(*COLS[c])[r]
    dw = xr - xl; m = dw * inset
    qx = int(xl + dw / 4)  # the diamonds here are flatter than 2:1: measure the top edge a quarter of the way in
    top = next(yy for yy in range(int(y - dw / 4) + 8, y) if FG[yy, qx])  # starts below the tile above
    hh = 2 * (y - top)  # half the diamond's height
    t = img.crop((int(xl + m), int(y - hh + m / 2), int(xr - m), int(y + hh - m / 2))).resize((256, 128), Image.LANCZOS).convert('RGBA')
    t.putalpha(Image.fromarray(DIAMOND))
    return t

def sample(t, pick):  # which edge midpoints show what pick() looks for
    a = np.asarray(t).astype(int); m = 0
    for bit, (x, y) in MID.items():
        px, py = int(x + (128 - x) * 0.18), int(y + (64 - y) * 0.18)
        if pick(a[py - 3:py + 4, px - 3:px + 4, :3]).mean() > 0.5: m |= bit
    return m

meta = json.load(open(OUT + 'sprites.json'))
def save(name, im, anchor=(128, 128)):
    im.save(OUT + name + '.png'); meta[name] = [im.width, im.height, *anchor]

# ---- asphalt: which neighbours each drawn tile joins, read by eye (the roads are off-centre, so sampling misreads them)
ROAD = {(0, 0): 12, (0, 1): 3, (1, 0): 5, (1, 1): 13, (1, 2): 15, (2, 0): 8, (2, 2): 0}
FLIP_V = lambda m: (m & 1) << 3 | (m & 8) >> 3 | (m & 4) >> 1 | (m & 2) << 1  # upside down: NW<->SW, NE<->SE
roads = {m: tile(r, c) for (r, c), m in ROAD.items()}
for m, t in list(roads.items()):  # a flat tile can be mirrored either way
    for f, op in ((MIRROR, ImageOps.mirror), (FLIP_V, ImageOps.flip), (lambda x: FLIP_V(MIRROR(x)), lambda i: ImageOps.flip(ImageOps.mirror(i)))):
        if f(m) not in roads: roads[f(m)] = op(t)
for m, t in roads.items(): save(f'road_{m}', t)
save('road_one', roads[0]); save('road_b', roads[3]); save('road_side', tile(2, 3))  # what the game builds the rest from
print('roads:', sorted(roads), 'built in the game:', sorted(set(range(16)) - set(roads)))

# ---- shores: a beach on one side each, the other sides by mirroring; open water
SHORE = {(6, 0): 1, (6, 1): 2, (6, 2): 8}
sides = {m: tile(r, c) for (r, c), m in SHORE.items()}
sides[4] = ImageOps.mirror(sides[1])
NAME = {1: 'nw', 2: 'se', 4: 'ne', 8: 'sw'}
def beach(t):  # only the sand and grass: it is laid over the open water, so the water stays one colour
    a = np.asarray(t).astype(int)
    land = np.maximum(a[:, :, 0] - a[:, :, 2], a[:, :, 1] - a[:, :, 2] - 10)
    alpha = np.clip((land + 10) / 35, 0, 1) * (a[:, :, 3] / 255)
    alpha = ndimage.uniform_filter(alpha, 3)
    return Image.fromarray(np.dstack([a[:, :, :3], alpha * 255]).astype(np.uint8), 'RGBA')
for m, t in sides.items(): save('shore_' + NAME[m], beach(t))
save('water', tile(8, 0, 0.06))  # deeper inside: its rim is darker and would draw a grid
print('shore sides:', sorted(NAME[m] for m in sides))

# ---- props in the bottom strip: (name, x range, where it stands on the tile as (u, v), width as a share of the tile)
PROPS = [('bus', (15, 103)), ('pole', (264, 297), (0.5, 0.5), 0.16), ('manhole', (353, 407), (0.5, 0.5), 0.24),
         ('puddle', (429, 507), (0.5, 0.5), 0.42), ('hydrant', (534, 563), (0.2, 0.5), 0.1), ('lamp', (602, 636), (0.12, 0.12), 0.13)]
veh = json.load(open(OUT + 'vehicles.json'))
for name, (x0, x1), *place in PROPS:
    sub = A[580:660, x0 - 4:x1 + 4]
    l2, h2 = sub.min(2), sub.max(2)
    lab, _ = ndimage.label((l2 > 205) & (h2 - l2 < 30))
    edge = set(lab[0]) | set(lab[-1]) | set(lab[:, 0]) | set(lab[:, -1])
    fg = ndimage.binary_erosion(~np.isin(lab, [l for l in edge if l]))
    ys, xs = np.nonzero(fg)
    p = Image.fromarray(np.dstack([sub, np.where(fg, 255, 0)]).astype(np.uint8), 'RGBA').crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    if name == 'bus':  # seen from behind, driving away up-right; mirrored it drives away up-left
        p = p.resize((200, round(p.height * 200 / p.width)), Image.LANCZOS)
        p.save(OUT + 'veh_bus_ne.png'); ImageOps.mirror(p).save(OUT + 'veh_bus_nw.png')
        veh['bus_ne'] = veh['bus_nw'] = list(p.size)
        continue
    (u, v), share = place
    k = 256 * share / p.width
    p = p.resize((max(1, round(p.width * k)), max(1, round(p.height * k))), Image.LANCZOS)
    tx, ty = 128 + (u - v) * 128, (u + v) * 64  # the standing point in a 256x128 tile
    save('prop_' + name, p, (round(p.width / 2 - (tx - 128)), round(p.height - (ty - 128))))
json.dump(veh, open(OUT + 'vehicles.json', 'w'), separators=(',', ':'))
json.dump(meta, open(OUT + 'sprites.json', 'w'), separators=(',', ':'))
print('props done')

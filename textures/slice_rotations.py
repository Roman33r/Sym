# Cuts a sheet of buildings drawn in four rotations (rows = buildings, columns = views, white background, no ground
# plate) into textures/<name>_<way>.png and adds them to sprites.json; all views of a building get one scale.
# <way> is where the entrance looks: sw, se (the lower walls), ne, nw (turned away). PICK says which column is which way; '~n' takes column n mirrored, for a
# view the generator got wrong. The building's own footprint is FOOT of the tile, centred on it.
# Usage: python slice_rotations.py <sheet image>
import json, sys
import numpy as np
from PIL import Image, ImageOps
from scipy import ndimage

OUT = 'E:/Grad/textures/'
ROWS = ['firewell', 'firestation', 'healer']
PICK = {  # way: column (0-based) on this sheet
    'firewell': {'sw': 1, 'se': 0, 'ne': 3, 'nw': '~3'},
    'firestation': {'sw': 0, 'se': 1, 'ne': 2, 'nw': '~2'},
    'healer': {'sw': 0, 'se': 1, 'ne': 2, 'nw': 3},
}
FOOT = {'firewell': 0.62, 'firestation': 0.86, 'healer': 0.74}
im = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(int)
H, W = im.shape[:2]
cw, ch = W / 4, H / len(ROWS)
meta = json.load(open(OUT + 'sprites.json'))

def cut(r, c):
    cell = im[int(r * ch):int((r + 1) * ch), int(c * cw):int((c + 1) * cw)]
    lo, hi = cell.min(2), cell.max(2)
    lab, _ = ndimage.label((lo > 205) & (hi - lo < 30))
    edge = set(lab[0]) | set(lab[-1]) | set(lab[:, 0]) | set(lab[:, -1])
    fg = ~np.isin(lab, [l for l in edge if l])
    fl, n = ndimage.label(fg)
    sizes = ndimage.sum(fg, fl, range(1, n + 1))
    fg = np.isin(fl, [k + 1 for k, s in enumerate(sizes) if s > max(30, sizes.max() * 0.02)])
    fg = ndimage.binary_erosion(fg)
    ys, xs = np.nonzero(fg)
    img = Image.fromarray(np.dstack([cell, np.where(fg, 255, 0)]).astype(np.uint8), 'RGBA').crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    return img

for r, name in enumerate(ROWS):
    views = {}
    for way, col in PICK[name].items():
        flip = isinstance(col, str)
        img = cut(r, int(col[1:]) if flip else col)
        views[way] = ImageOps.mirror(img) if flip else img
    # one scale for the whole building (the sheet draws all views alike), from the width of its front view's base
    a = np.asarray(views['sw'])[:, :, 3] > 0
    ys, xs = np.nonzero(a)
    low = ys > ys.max() - (ys.max() - ys.min()) * 0.45
    k = 256 * FOOT[name] / (xs[low].max() - xs[low].min())
    for way, img in views.items():
        a = np.asarray(img)[:, :, 3] > 0
        ys, xs = np.nonzero(a)
        bx, by = np.median(xs[ys >= ys.max() - 2]), ys.max()  # the lowest point: the footprint's bottom corner
        img = img.resize((max(1, round(img.width * k)), max(1, round(img.height * k))), Image.LANCZOS)
        down = (1 - FOOT[name]) * 64  # the tile's bottom vertex lies this far below the footprint's (tile 256 wide)
        meta[f'{name}_{way}'] = [img.width, img.height, round(bx * k), round(by * k + down)]
        img.save(OUT + f'{name}_{way}.png')
        print(name, way, meta[f'{name}_{way}'])
json.dump(meta, open(OUT + 'sprites.json', 'w'), separators=(',', ':'))

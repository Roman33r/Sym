# Cuts a walk-cycle sheet (rows = directions, a frame per column, white cells with dark borders) into
# textures/veh_<prefix>_<way>_<frame>.png (prefix ped by default) and adds them to vehicles.json. Every frame of a direction gets the same canvas,
# with the body's middle and the feet in the same place, so the walker doesn't jitter. <way>: se (towards the viewer,
# down-right) and ne (away, up-right); the game mirrors them into sw and nw.
# Usage: python slice_walk.py <sheet image> [prefix] [frames a row, 6 by default] [flipne: the back row walks up-left, mirror it]
#        [--way se|ne: the sheet is one row, that direction]
import json, sys
import numpy as np
from PIL import Image
from scipy import ndimage

OUT = 'E:/Grad/textures/'
ROWS = {0: 'se', 1: 'ne'}  # row on the sheet → direction; rows 3-4 turn the head both ways, so nw is ne mirrored
COLS = FRAMES = int(sys.argv[3]) if len(sys.argv) > 3 and sys.argv[3].isdigit() else 6
NROWS = 4
if '--way' in sys.argv: ROWS, NROWS = {0: sys.argv[sys.argv.index('--way') + 1]}, 1  # a sheet of one row: one direction
im = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(int)
prefix = sys.argv[2] if len(sys.argv) > 2 else 'ped'
flip_ne = 'flipne' in sys.argv[4:]
H, W = im.shape[:2]
cw, ch = W / COLS, H / NROWS

def frame(r, c):
    cell = im[int(r * ch) + 4:int((r + 1) * ch) - 4, int(c * cw) + 4:int((c + 1) * cw) - 4]  # inside the cell borders
    lo, hi = cell.min(2), cell.max(2)
    lab, _ = ndimage.label((lo > 200) & (hi - lo < 30))
    edge = set(lab[0]) | set(lab[-1]) | set(lab[:, 0]) | set(lab[:, -1])
    fg = ~np.isin(lab, [l for l in edge if l])
    fl, n = ndimage.label(fg)
    sizes = ndimage.sum(fg, fl, range(1, n + 1))
    fg = fl == sizes.argmax() + 1  # the figure only, without bits of the cell border
    wl, wn = ndimage.label((lo > 215) & (hi - lo < 30) & fg)  # background shut in between the legs, arms or harness
    for k, n in enumerate(ndimage.sum(np.ones_like(lo), wl, range(1, wn + 1))):
        if n > 6: fg[wl == k + 1] = False
    fg = ndimage.binary_erosion(fg)
    ys, xs = np.nonzero(fg)
    top, bottom = ys.min(), ys.max()
    body = xs[ys < top + (bottom - top) * 0.55]  # head and torso: the part that doesn't swing
    return Image.fromarray(np.dstack([cell, np.where(fg, 255, 0)]).astype(np.uint8), 'RGBA'), np.median(body), bottom

veh = json.load(open(OUT + 'vehicles.json'))
for r, way in ROWS.items():
    frames = [frame(r, c) for c in range(FRAMES)]
    left = max(cx for _, cx, _ in frames); right = max(f.width - cx for f, cx, _ in frames)
    up = max(by for _, _, by in frames)
    w, h = int(left + right) + 2, int(up) + 3
    for k, (f, cx, by) in enumerate(frames):
        canvas = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        canvas.alpha_composite(f, (int(round(left - cx)) + 1, int(round(up - by)) + 1))  # body middle and feet aligned
        if way == 'ne' and flip_ne: canvas = canvas.transpose(Image.FLIP_LEFT_RIGHT)
        canvas.save(OUT + f'veh_{prefix}_{way}_{k + 1}.png')
        veh[f'{prefix}_{way}_{k + 1}'] = [w, h]
    print(way, w, h)
json.dump(veh, open(OUT + 'vehicles.json', 'w'), separators=(',', ':'))

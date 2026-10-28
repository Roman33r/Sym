# Cuts a character sheet (6 frames a row, white background, no borders; the bucket firefighter by default) into textures/veh_<prefix>_<act>_<way>_<n>.png
# and adds them to vehicles.json as [w, h, ax]: every frame of a row shares one canvas with the body's middle (ax) and
# the feet on the bottom line, so the man doesn't jitter; the game scales them by height, so splashes don't shrink him.
# Rows by default: run towards the viewer (se), run away up-left (nw), throw se, throw away up-right (ne); the game
# mirrors the rest. Other characters drawn the same way give their own prefix and rows.
# Usage: python slice_firemen.py <sheet image> [prefix rows], e.g. ... doc walk:se,walk:nw,treat:se,treat:nw
import json, sys
import numpy as np
from PIL import Image
from scipy import ndimage

OUT = 'E:/Grad/textures/'
PREFIX = sys.argv[2] if len(sys.argv) > 2 else 'ff'
ROWS = dict(enumerate(tuple(r.split(':')) for r in sys.argv[3].split(','))) if len(sys.argv) > 3 else {0: ('run', 'se'), 1: ('run', 'nw'), 2: ('throw', 'se'), 3: ('throw', 'ne')}
COLS, NROWS, H_OUT = 6, 4, 220  # frames are stored this tall
im = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(int)
H, W = im.shape[:2]
cw, ch = W / COLS, H / NROWS

def frame(r, c):
    cell = im[int(r * ch):int((r + 1) * ch), int(c * cw):int((c + 1) * cw)]
    lo, hi = cell.min(2), cell.max(2)
    lab, _ = ndimage.label((lo > 205) & (hi - lo < 30))
    edge = set(lab[0]) | set(lab[-1]) | set(lab[:, 0]) | set(lab[:, -1])
    means = ndimage.mean(lo, lab, range(1, lab.max() + 1))
    holes = [k + 1 for k, v in enumerate(means) if v > 236]  # near-white gaps shut in by thin lines (chains, handles), not light parts like a mask
    fg = ndimage.binary_erosion(~np.isin(lab, [l for l in edge if l] + holes))
    fl, n = ndimage.label(fg)
    sizes = ndimage.sum(fg, fl, range(1, n + 1))
    fg = np.isin(fl, [k + 1 for k, s in enumerate(sizes) if s > max(40, sizes.max() * 0.004)])  # the man and the water drops
    man = fl == sizes.argmax() + 1
    ys, xs = np.nonzero(man)
    top, bottom = ys.min(), ys.max()
    body = xs[ys < top + (bottom - top) * 0.4]  # head and shoulders: they don't swing
    return Image.fromarray(np.dstack([cell, np.where(fg, 255, 0)]).astype(np.uint8), 'RGBA'), np.median(body), bottom, bottom - top

veh = json.load(open(OUT + 'vehicles.json'))
heights = []
rows = {r: [frame(r, c) for c in range(COLS)] for r in ROWS}
k = H_OUT / max(h for fr in rows.values() for *_, h in fr)  # one scale for the whole sheet: the man stays one size
for r, (act, way) in ROWS.items():
    fr = rows[r]
    left = max(cx for _, cx, _, _ in fr); right = max(f.width - cx for f, cx, _, _ in fr)
    up = max(by for _, _, by, _ in fr)
    w, h = int(left + right) + 2, int(up) + 3
    for n, (f, cx, by, _) in enumerate(fr):
        canvas = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        canvas.alpha_composite(f, (int(round(left - cx)) + 1, int(round(up - by)) + 1))
        canvas = canvas.resize((max(1, round(w * k)), max(1, round(h * k))), Image.LANCZOS)
        canvas.save(OUT + f'veh_{PREFIX}_{act}_{way}_{n + 1}.png')
        veh[f'{PREFIX}_{act}_{way}_{n + 1}'] = [canvas.width, canvas.height, round((left + 1) * k)]
    print(act, way, canvas.size)
json.dump(veh, open(OUT + 'vehicles.json', 'w'), separators=(',', ':'))

# Cuts the vehicle collage (4 columns x 4 rows, white background) into textures/veh_<name>.png and
# textures/vehicles.json {name: [w, h]}. Each picture is named by the way it drives: se = along +x (down-right),
# nw = along -x, sw = along +y (down-left), ne = along -y; e / w for the walker facing right / left.
# Usage: python slice_vehicles.py <collage.jpg>
import json, sys
import numpy as np
from PIL import Image
from scipy import ndimage

OUT = 'E:/Grad/textures/'
NAMES = [['car1_se', 'car1_nw', 'car2_sw', 'car2_nw'], ['car3_sw', 'car3_ne', 'truck_se', 'truck_nw'],
         ['cart_sw', 'cart_nw', 'bus_se', 'bus_sw'], ['tram_sw', 'tram_nw', 'ped_e', 'ped_w']]
im = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(int)
H, W = im.shape[:2]
cw, ch = W / 4, H / 4
meta = {}
for r, row in enumerate(NAMES):
    for c, name in enumerate(row):
        if not name: continue
        cell = im[int(r * ch):int((r + 1) * ch), int(c * cw):int((c + 1) * cw)]
        lo, hi = cell.min(2), cell.max(2)
        lab, _ = ndimage.label((lo > 200) & (hi - lo < 30))
        edge = set(lab[0]) | set(lab[-1]) | set(lab[:, 0]) | set(lab[:, -1])
        fg = ~np.isin(lab, [l for l in edge if l])
        fl, n = ndimage.label(fg)
        sizes = ndimage.sum(fg, fl, range(1, n + 1))
        fg = np.isin(fl, [k + 1 for k, s in enumerate(sizes) if s > max(60, sizes.max() * 0.02)])  # drop specks
        fg = ndimage.binary_erosion(fg)  # the antialiased rim is half white
        ys, xs = np.nonzero(fg)
        img = Image.fromarray(np.dstack([cell, np.where(fg, 255, 0)]).astype(np.uint8), 'RGBA')
        img = img.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
        k = min(1, 200 / img.width)  # plenty for the sizes on the map
        img = img.resize((max(1, round(img.width * k)), max(1, round(img.height * k))), Image.LANCZOS)
        img.save(OUT + 'veh_' + name + '.png')
        meta[name] = list(img.size)
json.dump(meta, open(OUT + 'vehicles.json', 'w'), separators=(',', ':'))
print(meta)

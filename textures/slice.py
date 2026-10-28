# Cuts the generated collages into game textures: removes the white background and the pale plate under
# buildings, finds the tile diamond (its bottom vertex and width), scales so the diamond is 256 px wide.
# Output: E:/Grad/textures/<name>.png and textures/sprites.json {name: [w, h, ax, ay]} — (ax, ay) is the
# diamond's bottom vertex in the image. Flat ground tiles are cut to an exact 256x128 diamond instead.
import json, sys
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = sys.argv[1]
OUT = 'E:/Grad/textures/'
SHEETS = {
    '7.jpg': (4, 4, [['house_0_1', 'house_0_2', 'house_1_1', 'house_1_2'], ['house_2_1', 'house_2_2', 'house_3_1', 'house_3_2'],
                     ['house_4_1', 'off_1', 'off_2', 'off_3'], ['off_4', 'ind_1', 'ind_2', 'ind_3']]),
    '8.jpg': (4, 5, [['farm_crops', 'farm_livestock', 'sawmill', 'quarry'], ['ironmine', 'goldmine', 'oilwell', 'refinery'],
                     ['tree_1', 'tree_2', 'tree_3', 'tree_4'], ['rock_1', 'iron_1', 'gold_1', 'oil_1'], ['rock_2', 'iron_2', 'gold_2', None]]),
    '9.jpg': (4, 3, [['depot', 'market', 'shop', 'park'], ['stop_horse', 'stop_bus', 'kinder', 'school'], ['hospital', 'uni', 'plant', 'pump']]),
    '10.jpg': (4, 4, [['grass_1', 'grass_2', 'grass_3', 'water_deep'], ['water_shallow', 'zone_res', 'zone_off', 'zone_ind'],
                      ['road_a', 'road_b', 'road_curve', 'road_t'], ['road_x', 'road_end', 'road_one', 'path_x']]),
}
FLAT = {n for row in SHEETS['10.jpg'][2] for n in row}

meta = {}
for file, (cols, rows, names) in SHEETS.items():
    im = np.asarray(Image.open(SRC + file).convert('RGB')).astype(int)
    H, W = im.shape[:2]
    cw, ch = W / cols, H / rows
    for r in range(rows):
        for c in range(cols):
            name = names[r][c]
            if not name: continue
            top = int(r * ch) + (60 if file == '8.jpg' and r >= 3 else 0)  # forest tiles above reach into these cells
            cell = im[top:int((r + 1) * ch), int(c * cw):int((c + 1) * cw)]
            lo, hi = cell.min(2), cell.max(2)
            light = (lo > 165) & (hi - lo < 40)  # white, the cream plate and its grey outline
            lab, _ = ndimage.label(light)
            edge = set(lab[0]) | set(lab[-1]) | set(lab[:, 0]) | set(lab[:, -1])
            bg = np.isin(lab, [l for l in edge if l])
            plate = bg & (lo < 250)  # the part of the background that isn't pure white
            fg = ~bg
            # keep the main object: drop specks and bits of neighbours cut by the cell border
            fl, n = ndimage.label(fg)
            if n:
                sizes = ndimage.sum(fg, fl, range(1, n + 1))
                big = sizes.argmax() + 1
                bord = set(fl[0]) | set(fl[-1]) | set(fl[:, 0]) | set(fl[:, -1])
                keep = [k + 1 for k, s in enumerate(sizes) if k + 1 == big or (s > 150 and k + 1 not in bord)]
                fg = np.isin(fl, keep)
            ys, xs = np.nonzero(fg)
            # tile diamond: from the plate if there is one, else from the object's own ground
            if plate.sum() > 2000 and name not in FLAT:
                py, px = np.nonzero(plate | fg)
                low = py > py.min() + (py.max() - py.min()) * 0.4
                px2, py2 = px[low], py[low]
            else:
                low = ys > ys.min() + (ys.max() - ys.min()) * 0.4
                px2, py2 = xs[low], ys[low]
            xl, xr = px2.min(), px2.max()
            yl = int(np.median(py2[px2 <= xl + 2]))
            dw = xr - xl
            bx, by = (xl + xr) / 2, yl + dw / 4  # bottom vertex of a 2:1 diamond
            rgba = np.dstack([cell, np.where(fg, 255, 0)]).astype(np.uint8)
            img = Image.fromarray(rgba, 'RGBA')
            k = 256 / dw
            if name in FLAT:  # exact diamond, cut to its shape
                m = dw * 0.025  # a little inside, so the dark outline doesn't draw a grid on the map
                box = (int(xl + m), int(yl - dw / 4 + m / 2), int(xr - m), int(yl + dw / 4 - m / 2))
                img = img.crop(box).resize((256, 128), Image.LANCZOS)
                mask = Image.new('L', (256, 128), 0)
                from PIL import ImageDraw
                ImageDraw.Draw(mask).polygon([(128, 0), (256, 64), (128, 128), (0, 64)], fill=255)
                a = np.minimum(np.asarray(img)[:, :, 3], np.asarray(mask))
                img.putalpha(Image.fromarray(a))
                img.save(OUT + name + '.png')
                meta[name] = [256, 128, 128, 128]
                continue
            x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, max(ys.max() + 1, int(by) + 1)
            img = img.crop((x0, y0, x1, y1))
            w, h = round((x1 - x0) * k), round((y1 - y0) * k)
            img = img.resize((w, h), Image.LANCZOS)
            img.save(OUT + name + '.png')
            meta[name] = [w, h, round((bx - x0) * k), round((by - y0) * k)]
            print(name, meta[name], 'diamond', dw)
json.dump(meta, open(OUT + 'sprites.json', 'w'), separators=(',', ':'))
print(len(meta), 'textures')

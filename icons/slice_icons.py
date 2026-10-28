# Cuts the icon collages (white background, equal cells) into icons/<name>.png, 96x96 with a transparent background.
# Usage: python slice_icons.py <folder with 14.jpg … 18.jpg>
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

OUT = 'E:/Grad/icons/'
SHEETS = {
    '14.jpg': [['info', 'buy', 'clear', 'bulldoze'], ['upgrade', 'path', 'road', 'power'], ['pipe', 'stop', 'zres', 'zoff'], ['zind', 'house', 'shop', 'park']],
    '15.jpg': [['market', 'farm', 'sawmill', 'quarry'], ['mine', 'oilwell', 'refinery', 'plant'], ['pump', 'kinder', 'school', 'hospital'], ['uni', 'ind', None, None]],
    '16.jpg': [['village', 'town', 'city', 'metro'], ['research', 'edu', 'art', 'engine'], ['bus', None, None, None]],
    '17.jpg': [['pause', 'play', 'fast', 'faster', 'pollution'], ['restart', 'ok', 'no', 'warn', 'lock'], ['prod', 'upkeep', 'noise', 'host', 'join'], ['invite', 'copy', 'dice', None, None]],
    '22.webp': [['firewell', 'firestation', 'healer', 'cobble'], ['fire', 'sick', 'drought', 'storm'], ['herbalism', 'firefighting', 'quarantine', 'seismic']],
    '33.png': [['smelter', 'ironore', 'goldore']],
    '18.jpg': [['money', 'wood', 'stone', 'food', 'iron'], ['gold', 'oil', 'asphalt', 'horses', 'pop'], ['happy', 'jobs', 'land', 'depot', 'clothes'], ['furniture', 'canned', 'tools', 'jewelry', None]],
}
SIZE = 96
CROP = {'22.webp': 870, '33.png': (352, 655, 30)}  # the icons end above an empty strip at the bottom; (top, bottom, side inset): only that strip, inside each cell's frame
for file, rows in SHEETS.items():
    im = np.asarray(Image.open(sys.argv[1] + '/' + file).convert('RGB')).astype(int)
    top, bottom, inset = CROP[file] if isinstance(CROP.get(file), tuple) else (0, CROP.get(file), 0)
    im = im[top:bottom]
    H, W = im.shape[:2]
    cw, ch = W / len(rows[0]), H / len(rows)
    for r, row in enumerate(rows):
        for c, name in enumerate(row):
            if not name: continue
            cell = im[int(r * ch):int((r + 1) * ch), int(c * cw) + inset:int((c + 1) * cw) - inset]
            lo, hi = cell.min(2), cell.max(2)
            lab, _ = ndimage.label((lo > 205) & (hi - lo < 30))  # white background, reached from the cell border
            edge = set(lab[0]) | set(lab[-1]) | set(lab[:, 0]) | set(lab[:, -1])
            fg = ~np.isin(lab, [l for l in edge if l])
            fl, n = ndimage.label(fg)
            sizes = ndimage.sum(fg, fl, range(1, n + 1))
            fg = np.isin(fl, [k + 1 for k, s in enumerate(sizes) if s > max(40, sizes.max() * 0.01)])  # drop specks
            fg = ndimage.binary_erosion(fg)  # the antialiased rim is half white
            ys, xs = np.nonzero(fg)
            img = Image.fromarray(np.dstack([cell, np.where(fg, 255, 0)]).astype(np.uint8), 'RGBA')
            img = img.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
            side = max(img.size)
            sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
            sq.paste(img, ((side - img.width) // 2, (side - img.height) // 2))  # centred in a square
            sq.resize((SIZE, SIZE), Image.LANCZOS).save(OUT + name + '.png')
print('done')

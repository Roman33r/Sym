# Puts back the flat roofs some building sprites lost when their light roof was cut out with the white background.
# The roof is rebuilt as the 2:1 diamond over the walls: its front corner is where the two parapet edges meet (the
# lowest point of the sprite's top outline), its sides follow the 2:1 slopes to the sprite's left and right edges,
# and the back corner closes the diamond (the canvas grows upwards when it is above the picture). The roof goes under
# the picture, so the parapets and outlines that are left stay on top; sprites.json gets the new height and anchor.
# Run it once per sprite, on the picture as it was sliced (a second run would grow the canvas again).
# Usage: python fix_roofs.py <name>=<r,g,b> ...
import json, sys
import numpy as np
from PIL import Image, ImageDraw

OUT = 'E:/Grad/textures/'
meta = json.load(open(OUT + 'sprites.json'))
for arg in sys.argv[1:]:
    name, col = arg.split('='); col = tuple(int(v) for v in col.split(','))
    im = Image.open(OUT + name + '.png').convert('RGBA')
    al = np.asarray(im)[:, :, 3] > 128
    W, H = im.size
    top = np.array([np.argmax(al[:, x]) if al[:, x].any() else H for x in range(W)])
    xf = max(range(W // 5, W - W // 5), key=lambda x: top[x])  # front corner: the dip between the two parapets
    yf = top[xf]
    xl, xr = 2, W - 3
    yl, yr = yf - (xf - xl) / 2, yf - (xr - xf) / 2
    xb, yb = xl + xr - xf, yl + yr - yf
    pad = max(0, int(np.ceil(-yb)) + 3)
    roof = Image.new('RGBA', (W, H + pad), (0, 0, 0, 0)); d = ImageDraw.Draw(roof)
    pts = [(xl, yl + pad), (xb, yb + pad), (xr, yr + pad), (xf, yf + pad + 2)]
    d.polygon(pts, fill=col + (255,))
    d.line([pts[0], pts[1], pts[2]], fill=(36, 30, 30, 255), width=2)  # the back edges' outline
    # bits of the old outline left above the new back edges would float over the roof's rim: drop them
    keep = Image.new('L', roof.size, 255); ImageDraw.Draw(keep).polygon([(0, 0), (W, 0), (W, yr + pad), pts[2], pts[1], pts[0], (0, yl + pad)], fill=0)
    lifted = Image.new('RGBA', roof.size, (0, 0, 0, 0)); lifted.paste(im, (0, pad))
    lifted.putalpha(Image.fromarray(np.minimum(np.asarray(lifted)[:, :, 3], np.asarray(keep))))
    roof.alpha_composite(lifted)
    roof.save(OUT + name + '.png')
    m = meta[name]; meta[name] = [m[0], m[1] + pad, m[2], m[3] + pad]
    print(name, 'front', (xf, yf), 'back', (round(xb), round(yb)), 'pad', pad, meta[name])
json.dump(meta, open(OUT + 'sprites.json', 'w'), separators=(',', ':'))

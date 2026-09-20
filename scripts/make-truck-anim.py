#!/usr/bin/env python3
"""Bake the hero truck animation: transparent WebP with self-spinning wheels,
rendered from the pristine transparent split layers (src/assets/truck-body.png
+ truck-wheel-{front,rear}.png via scripts/truck-layers.json).

NOTE: the LOADER uses the user's raw GIF instead (public/shiftify-truck-loader.gif,
served on a black intro background — the gif ships with a baked black bg that
cannot be keyed out: its tires are pure black and CONNECTED to the background,
and the gif's render proportions differ slightly from the layer master, so a
silhouette transplant mis-registers the trailer). This WebP is the same
artwork/animation look for the light hero section.

Output: public/shiftify-truck-anim.webp  (36 frames @ 40 ms = 1.44 s loop,
wheels make exactly 2 full turns per loop so the loop is seamless)
"""
import json
from PIL import Image

ROOT = '/home/user/shiftify'
OUT_W = 1000
N_FRAMES = 36
DURATION_MS = 40
TURNS_PER_LOOP = 2

layers = json.load(open(f'{ROOT}/scripts/truck-layers.json'))
wl = {w['name']: w for w in layers['wheels']}
body = Image.open(f'{ROOT}/src/assets/truck-body.png').convert('RGBA')
fw = Image.open(f'{ROOT}/src/assets/truck-wheel-front.png').convert('RGBA')
rw = Image.open(f'{ROOT}/src/assets/truck-wheel-rear.png').convert('RGBA')

fpos = (wl['front']['x'] - fw.width // 2, wl['front']['y'] - fw.height // 2)
rpos = (wl['rear']['x'] - rw.width // 2, wl['rear']['y'] - rw.height // 2)

step = 360.0 * TURNS_PER_LOOP / N_FRAMES
frames = []
for i in range(N_FRAMES):
    ang = -(i * step) % 360  # negative = rolling forward (truck faces left)
    fr = body.copy()
    w_f = fw.rotate(ang, resample=Image.BICUBIC)
    w_r = rw.rotate(ang, resample=Image.BICUBIC)
    fr.paste(w_f, fpos, w_f)
    fr.paste(w_r, rpos, w_r)
    h = round(body.height * OUT_W / body.width)
    frames.append(fr.resize((OUT_W, h), Image.LANCZOS))

frames[0].save(f'{ROOT}/public/shiftify-truck-anim.webp', 'WEBP', save_all=True,
               append_images=frames[1:], duration=DURATION_MS, loop=0,
               quality=88, method=6, exact=True)
frames[0].save(f'{ROOT}/public/shiftify-truck-anim-poster.webp', 'WEBP', quality=90, method=6, exact=True)
print('wrote public/shiftify-truck-anim.webp and poster (layer-rendered)')

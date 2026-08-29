from PIL import Image, ImageDraw, ImageFont, ImageFilter
from math import cos, pi, sin
from pathlib import Path

ROOT = Path('/home/ubuntu/extracted-product-mobile-app')
OUT = Path('/home/ubuntu/toronto-flight-storyboard.png')
W, H = 1800, 1460
PANEL_W, PANEL_H = 550, 560
MARGIN_X, TOP = 75, 250
GAP_X, GAP_Y = 25, 42

try:
    font_title = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 40)
    font_panel = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 19)
    font_small = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 15)
    font_label = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 13)
except OSError:
    font_title = font_panel = font_small = font_label = ImageFont.load_default()

flying = Image.open(ROOT / 'assets/images/staarwardd/guardian-poses/flying.png').convert('RGBA')
summon = Image.open(ROOT / 'assets/images/staarwardd/guardian-poses/summon.png').convert('RGBA')
guardian_toronto = Image.open(ROOT / 'assets/images/staarwardd/guardian-toronto.png').convert('RGBA')

def alpha_paste(base, asset, center, max_w, max_h, opacity=255):
    ratio = min(max_w / asset.width, max_h / asset.height)
    im = asset.resize((max(1, int(asset.width * ratio)), max(1, int(asset.height * ratio))), Image.Resampling.LANCZOS)
    if opacity < 255:
        a = im.getchannel('A').point(lambda x: x * opacity // 255)
        im.putalpha(a)
    base.alpha_composite(im, (int(center[0] - im.width / 2), int(center[1] - im.height / 2)))

def gradient_panel(index):
    panel = Image.new('RGBA', (PANEL_W, PANEL_H), '#071126')
    px = panel.load()
    for y in range(PANEL_H):
        for x in range(PANEL_W):
            horizon = max(0, 1 - abs(y - PANEL_H * 0.55) / (PANEL_H * 0.7))
            r = int(5 + 24 * horizon + index * 2)
            g = int(12 + 20 * horizon + (x / PANEL_W) * 8)
            b = int(31 + 60 * horizon + index * 3)
            px[x, y] = (r, g, b, 255)
    return panel

def draw_skyline(draw, y, seed):
    heights = [70, 114, 88, 154, 96, 183, 122, 102, 168, 94, 128, 190, 110, 78]
    width = PANEL_W // len(heights)
    for i, height in enumerate(heights):
        x = i * width
        color = (10 + (i % 3) * 3, 24 + seed * 2, 54 + (i % 4) * 8, 255)
        draw.rectangle((x, y - height, x + width - 3, y), fill=color)
        if i % 3 == 0:
            for yy in range(y - height + 15, y - 9, 20):
                draw.rectangle((x + 9, yy, x + 14, yy + 4), fill=(199, 180, 107, 120))
    cx = int(PANEL_W * 0.71)
    draw.rectangle((cx - 6, y - 260, cx + 6, y), fill=(13, 34, 70, 255))
    draw.polygon([(cx - 23, y - 225), (cx + 23, y - 225), (cx, y - 302)], fill=(22, 49, 91, 255))
    draw.line((cx, y - 302, cx, y - 365), fill=(232, 200, 111, 210), width=2)

def route(draw, points, color=(239, 215, 130, 200)):
    for a, b in zip(points, points[1:]):
        draw.line((*a, *b), fill=color, width=3)
    for x, y in points:
        draw.ellipse((x - 4, y - 4, x + 4, y + 4), fill=color)

def energy_ring(draw, center, radius, color):
    cx, cy = center
    for i in range(42):
        a = (i / 42) * 2 * pi
        jitter = 7 * sin(i * 2.8)
        x = cx + cos(a) * (radius + jitter)
        y = cy + sin(a) * (radius + jitter)
        size = 2 + (i % 3)
        draw.ellipse((x - size, y - size, x + size, y + size), fill=color)
    draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), outline=color, width=3)

def panel(title, caption, index, scene):
    canvas = gradient_panel(index)
    draw = ImageDraw.Draw(canvas, 'RGBA')
    draw.rounded_rectangle((0, 0, PANEL_W - 1, PANEL_H - 1), radius=26, outline=(232, 200, 111, 150), width=2)
    draw.text((23, 20), title, font=font_panel, fill=(245, 249, 255, 255))
    draw.text((23, 51), caption, font=font_small, fill=(193, 207, 231, 255))
    draw.line((23, 80, PANEL_W - 23, 80), fill=(232, 200, 111, 95), width=1)
    draw.text((23, PANEL_H - 31), 'IMPLEMENTED STATE PREVIEW', font=font_label, fill=(232, 200, 111, 230))
    scene(canvas, draw)
    return canvas

def distant(canvas, draw):
    draw_skyline(draw, 470, 1)
    route(draw, [(470, 175), (405, 210), (335, 280), (260, 335)], (112, 205, 255, 170))
    alpha_paste(canvas, flying, (470, 170), 92, 112)
    draw.text((235, 119), 'DISTANT ENTRY', font=font_label, fill=(145, 211, 255, 255))

def camera_pass(canvas, draw):
    draw_skyline(draw, 470, 2)
    route(draw, [(74, 292), (190, 224), (315, 242), (438, 195)], (142, 224, 202, 190))
    alpha_paste(canvas, flying, (258, 235), 190, 240)
    for i in range(15):
        x = 110 + i * 23
        y = 320 + int(sin(i) * 18)
        draw.ellipse((x - 3, y - 3, x + 3, y + 3), fill=(109, 231, 213, 210))
    draw.text((62, 139), 'SKYLINE SWEEP', font=font_label, fill=(143, 236, 215, 255))

def center_arrival(canvas, draw):
    draw_skyline(draw, 470, 3)
    draw.ellipse((137, 122, 413, 398), outline=(160, 137, 255, 150), width=2)
    alpha_paste(canvas, flying, (275, 270), 235, 290)
    draw.text((178, 119), 'CENTER REACHED', font=font_label, fill=(201, 184, 255, 255))

def shield_arrival(canvas, draw):
    draw_skyline(draw, 470, 4)
    alpha_paste(canvas, flying, (260, 290), 198, 250)
    for r in (40, 62, 84):
        draw.rounded_rectangle((340-r//2, 178-r//2, 340+r//2, 178+r//2), radius=15, outline=(240, 212, 122, 180), width=3)
    draw.text((335, 238), '✦', font=font_title, fill=(249, 228, 152, 255), anchor='mm')
    draw.line((463, 118, 352, 205), fill=(240, 212, 122, 170), width=3)
    draw.text((282, 113), 'AEGIS ARRIVES', font=font_label, fill=(244, 217, 133, 255))

def summon_portal(canvas, draw):
    draw_skyline(draw, 470, 5)
    alpha_paste(canvas, summon, (276, 300), 250, 315)
    energy_ring(draw, (275, 232), 105, (245, 209, 120, 225))
    draw.line((201, 330, 260, 246), fill=(245, 209, 120, 200), width=2)
    draw.line((350, 330, 290, 246), fill=(245, 209, 120, 200), width=2)
    draw.text((161, 116), 'TWO-HANDED ENERGY CONVERGENCE', font=font_label, fill=(245, 216, 133, 255))

def gateways(canvas, draw):
    alpha_paste(canvas, summon, (276, 290), 220, 275)
    colors = ['#B999FF', '#79BAFF', '#F1B976', '#79E4CA', '#F4A7C2', '#F0D47C', '#D7A16F']
    glyphs = ['✦', '▥', '⌂', '◉', '∞', '◇', '△']
    for i, (color, glyph) in enumerate(zip(colors, glyphs)):
        a = (i / 7) * 2 * pi - pi/2
        x = 276 + cos(a) * 180
        y = 285 + sin(a) * 160
        draw.ellipse((x - 32, y - 32, x + 32, y + 32), outline=color, width=3, fill=(9, 19, 43, 210))
        draw.text((x, y), glyph, font=font_panel, fill=color, anchor='mm')
    draw.text((173, 111), 'SEVEN DIMENSIONAL GATEWAYS FORM', font=font_label, fill=(245, 241, 218, 255))

canvas = Image.new('RGBA', (W, H), '#050916')
draw = ImageDraw.Draw(canvas, 'RGBA')
draw.text((75, 60), 'STAARWARDD · TORONTO FLIGHT STORYBOARD', font=font_title, fill=(247, 249, 255, 255))
draw.text((75, 120), 'Current implemented launch states • Visual storyboard only — not physical Android footage', font=font_small, fill=(201, 214, 237, 255))
draw.line((75, 160, W - 75, 160), fill=(232, 200, 111, 130), width=2)

frames = [
    panel('01 · DISTANT APPROACH', 'Guardian enters the Toronto field.', 1, distant),
    panel('02 · CAMERA PASS', 'Curved skyline sweep with trail.', 2, camera_pass),
    panel('03 · CENTER ARRIVAL', 'Flight resolves at the central field.', 3, center_arrival),
    panel('04 · AEGIS DELIVERY', 'Shield travels separately and locks.', 4, shield_arrival),
    panel('05 · PORTAL GESTURE', 'Two energy arcs converge into a ring.', 5, summon_portal),
    panel('06 · WORLD FORMATION', 'Seven gateways appear individually.', 6, gateways),
]
for idx, frame in enumerate(frames):
    row, col = divmod(idx, 3)
    canvas.alpha_composite(frame, (MARGIN_X + col * (PANEL_W + GAP_X), TOP + row * (PANEL_H + GAP_Y)))

canvas.convert('RGB').save(OUT, quality=94)
print(OUT)

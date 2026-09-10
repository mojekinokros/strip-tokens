#!/usr/bin/env python3
"""Generate public/images/og-cover.png (1200x630) with Pillow only.

Dark-navy secure-payments artwork: gradient background, glow, shield with
checkmark, token coins, and title text. Run: python3 scripts/generate-og.py
"""
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
OUT = "public/images/og-cover.png"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"


def vgradient(top, bottom):
    img = Image.new("RGB", (W, H), top)
    px = img.load()
    for y in range(H):
        t = y / (H - 1)
        px_line = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
        for x in range(W):
            px[x, y] = px_line
    return img


def glow(base, center, radius, color, strength=90):
    layer = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(layer)
    d.ellipse(
        [center[0] - radius, center[1] - radius, center[0] + radius, center[1] + radius],
        fill=strength,
    )
    layer = layer.resize((W // 4, H // 4), Image.BILINEAR).resize((W, H), Image.BILINEAR)
    solid = Image.new("RGB", (W, H), color)
    return Image.composite(solid, base, layer)


def coin(draw, cx, cy, r, fill, ring, letter_color):
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=fill, outline=ring, width=5)
    draw.ellipse(
        [cx - r + 14, cy - r + 14, cx + r - 14, cy + r - 14], outline=ring, width=3
    )
    f = ImageFont.truetype(FONT_BOLD, int(r * 1.05))
    draw.text((cx, cy), "T", font=f, fill=letter_color, anchor="mm")


img = vgradient((22, 32, 74), (10, 15, 36))
img = glow(img, (270, 300), 420, (124, 58, 237), 70)
img = glow(img, (980, 120), 320, (14, 165, 196), 55)
d = ImageDraw.Draw(img)

# subtle frame
d.rounded_rectangle([14, 14, W - 15, H - 15], radius=26, outline=(42, 53, 104), width=3)

# shield with check (left)
shield = [(270, 130), (430, 185), (430, 330), (270, 470), (110, 330), (110, 185)]
d.polygon(shield, fill=(12, 18, 38), outline=(139, 92, 246), width=9)
d.line([(205, 305), (252, 352), (335, 252)], fill=(52, 211, 153), width=26, joint="curve")

# coins
coin(d, 520, 165, 62, (109, 40, 217), (196, 181, 253), (255, 255, 255))
coin(d, 90, 520, 52, (14, 116, 144), (165, 243, 252), (224, 251, 255))
coin(d, 520, 500, 44, (14, 116, 144), (165, 243, 252), (224, 251, 255))

# text (right)
title_font = ImageFont.truetype(FONT_BOLD, 76)
sub_font = ImageFont.truetype(FONT_REG, 40)
tag_font = ImageFont.truetype(FONT_BOLD, 28)
tx = 600
d.text((tx, 150), "Stripchat", font=title_font, fill=(255, 255, 255))
d.text((tx, 235), "Tokens Guide", font=title_font, fill=(167, 139, 250))
d.text((tx, 350), "Legal ways to buy & use", font=sub_font, fill=(194, 201, 228))
d.text((tx, 400), "tokens safely", font=sub_font, fill=(194, 201, 228))
tag_text = "INDEPENDENT  •  EDUCATIONAL"
tag_bbox = d.textbbox((0, 0), tag_text, font=tag_font)
tag_w = tag_bbox[2] - tag_bbox[0]
d.rounded_rectangle([tx, 478, tx + tag_w + 48, 534], radius=14, outline=(34, 211, 238), width=3)
d.text((tx + 24, 506), tag_text, font=tag_font, fill=(34, 211, 238), anchor="lm")

img.save(OUT, optimize=True)
print(f"wrote {OUT}")

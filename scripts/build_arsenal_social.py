#!/usr/bin/env python3
"""Create a custom 1200x630 social preview from Arsenal's own visual materials.

No external images, fonts or network requests. A frame of the existing desktop
hero video is preferred; an existing client photograph is the fallback.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageEnhance, ImageFont, ImageOps, ImageStat
import io
import os
import shutil
import subprocess
import tempfile
import cairosvg

SIZE = (1200, 630)
BRONZE = (215, 173, 131)
WHITE = (247, 241, 236)
GRAY = (217, 203, 190)

def _font(size, bold=True):
    paths = (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf",
    )
    for path in ((paths[0], paths[2], paths[1]) if bold else (paths[1], paths[0])):
        if Path(path).is_file():
            return ImageFont.truetype(path, size=size)
    raise RuntimeError("A Cyrillic-capable font is needed for the social image")

def _source(root):
    video = root / "assets" / "hero-desktop.mp4"
    ffmpeg = shutil.which("ffmpeg")
    if video.exists() and ffmpeg:
        with tempfile.TemporaryDirectory() as tmp:
            frames = []
            for i, sec in enumerate(("1.7", "3.1", "4.8")):
                dst = Path(tmp) / ("hero-%s.jpg" % i)
                command = [ffmpeg, "-y", "-hide_banner", "-loglevel", "error",
                           "-ss", sec, "-i", str(video), "-frames:v", "1",
                           "-q:v", "3", str(dst)]
                try:
                    subprocess.run(command, check=True, timeout=20,
                                   stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
                    with Image.open(dst) as raw:
                        frame = raw.convert("RGB")
                    score = ImageStat.Stat(frame.resize((80, 45))).mean
                    # Prefer detailed, visible frames over black fade-in/fade-out.
                    lightness = sum(score) / 3
                    frames.append((abs(lightness - 90), frame))
                except (subprocess.CalledProcessError, subprocess.TimeoutExpired,
                        OSError, ValueError):
                    continue
            if frames:
                frames.sort(key=lambda item: item[0])
                return frames[0][1]
    for name in ("arsenal-garage-original-cleaned-20261030.webp",
                 "arsenal-frame-updated-20261030.webp",
                 "arsenal-garage-clean-20261030.webp"):
        path = root / "assets" / name
        if path.exists():
            with Image.open(path) as raw:
                return raw.convert("RGB")
    raise RuntimeError("No suitable Arsenal hero / project photo was found")

def _fit(draw, text, max_width, size, bold=True):
    while size > 24:
        font = _font(size, bold=bold)
        if draw.textbbox((0, 0), text, font=font)[2] <= max_width:
            return font
        size -= 2
    return _font(size, bold=bold)

def generate(root):
    root = Path(root)
    dst = root / "assets" / "arsenal-social-share.jpg"
    backdrop = ImageOps.fit(_source(root), SIZE, method=Image.Resampling.LANCZOS,
                            centering=(0.54, 0.5))
    backdrop = ImageEnhance.Contrast(backdrop).enhance(1.09)
    canvas = backdrop.convert("RGBA")

    # Espresso steel left panel fades seamlessly into the actual photograph.
    overlay = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    o = ImageDraw.Draw(overlay, "RGBA")
    for x in range(SIZE[0]):
        amount = max(0, min(1, x / SIZE[0]))
        darkness = int(240 - 178 * (amount ** 1.42))
        o.line(((x, 0), (x, SIZE[1])), fill=(13, 11, 12, darkness))
    for y in range(SIZE[1]):
        if y > 450:
            alpha = int(54 * ((y-450) / 180))
            o.line(((0, y), (SIZE[0], y)), fill=(12, 10, 10, alpha))
    canvas = Image.alpha_composite(canvas, overlay)

    d = ImageDraw.Draw(canvas, "RGBA")
    # Clean cinematic top and bottom rails, not a rounded banner tile.
    d.rounded_rectangle((28, 28, 1171, 601), radius=25, outline=(228, 196, 163, 95), width=2)
    d.line(((79, 178), (209, 178)), fill=BRONZE + (235,), width=3)
    d.line(((80, 580), (1109, 580)), fill=(229, 204, 175, 78), width=2)

    # Client-provided garage/car-and-shield mark, with a bronze on-image tint.
    icon_svg = root / "assets" / "arsenal-logo-black.svg"
    raw = cairosvg.svg2png(url=str(icon_svg), output_width=104, output_height=104)
    icon = Image.open(io.BytesIO(raw)).convert("RGBA")
    bronze = Image.new("RGBA", icon.size, BRONZE + (255,))
    bronze.putalpha(icon.getchannel("A"))
    canvas.alpha_composite(bronze, dest=(67, 54))
    d = ImageDraw.Draw(canvas, "RGBA")

    d.text((185, 68), "АРСЕНАЛ", font=_font(37), fill=WHITE)
    d.text((186, 116), "МЕТАЛЛОКОНСТРУКЦИИ  /  ПЕРМЬ", font=_font(16), fill=BRONZE)

    # A memorable three-line headline, retained from the production homepage.
    d.text((72, 214), "МЕТАЛЛ.", font=_fit(d, "МЕТАЛЛ.", 750, 83), fill=WHITE,
           stroke_width=1, stroke_fill=(16, 13, 12))
    d.text((72, 305), "ФОРМА.", font=_fit(d, "ФОРМА.", 750, 83), fill=WHITE,
           stroke_width=1, stroke_fill=(16, 13, 12))
    d.text((72, 396), "ХАРАКТЕР.", font=_fit(d, "ХАРАКТЕР.", 775, 78), fill=BRONZE,
           stroke_width=1, stroke_fill=(24, 17, 13))

    d.text((80, 532), "НАВЕСЫ  ·  ГАРАЖИ  ·  ЛЕСТНИЦЫ  ·  ТЕРРАСЫ",
           font=_fit(d, "НАВЕСЫ  ·  ГАРАЖИ  ·  ЛЕСТНИЦЫ  ·  ТЕРРАСЫ", 840, 20),
           fill=WHITE)
    d.text((922, 553), "NAVESY59.RU", font=_font(17), fill=(224, 187, 149))

    dst.parent.mkdir(parents=True, exist_ok=True)
    image = canvas.convert("RGB")
    image.save(dst, "JPEG", quality=90, subsampling=0, optimize=True,
               progressive=True)
    with Image.open(dst) as check:
        assert check.size == SIZE and check.format == "JPEG"
    return dst

if __name__ == "__main__":
    print(generate(Path(__file__).resolve().parent.parent))

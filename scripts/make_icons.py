"""Generate the extension icons. Requires Pillow: pip install pillow

Usage: python3 scripts/make_icons.py
"""

from pathlib import Path

from PIL import Image, ImageDraw

SIZES = [16, 32, 48, 128]
S = 1024  # draw large, then downsample for smooth edges
OUT = Path(__file__).resolve().parent.parent / "icons"

BG = (13, 15, 18, 255)
FG = (244, 242, 238, 255)
ACCENT = (159, 176, 255, 255)


def draw_master() -> Image.Image:
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 0.22), fill=BG)

    # Envelope
    stroke = int(S * 0.06)
    left, top, right, bottom = int(S * 0.2), int(S * 0.3), int(S * 0.8), int(S * 0.7)
    d.rounded_rectangle([left, top, right, bottom], radius=int(S * 0.05), outline=FG, width=stroke)
    d.line([(left + stroke // 2, top + stroke // 2), (S // 2, int(S * 0.52)),
            (right - stroke // 2, top + stroke // 2)], fill=FG, width=stroke, joint="curve")

    # Slash through it
    d.line([(int(S * 0.18), int(S * 0.82)), (int(S * 0.82), int(S * 0.18))],
           fill=BG, width=int(stroke * 2.6))
    d.line([(int(S * 0.18), int(S * 0.82)), (int(S * 0.82), int(S * 0.18))],
           fill=ACCENT, width=stroke)
    return img


def main() -> None:
    OUT.mkdir(exist_ok=True)
    master = draw_master()
    for size in SIZES:
        master.resize((size, size), Image.LANCZOS).save(OUT / f"icon{size}.png")
    print(f"Wrote {len(SIZES)} icons to {OUT}")


if __name__ == "__main__":
    main()

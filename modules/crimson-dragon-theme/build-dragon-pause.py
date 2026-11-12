"""Bake the pause dragon: a still pose whose eye, open mouth and gems pulse with light.

Nothing moves. The jaws are held open on a glowing throat, and only the light
changes from frame to frame.

Reads the painted still from the Crimson Tyrant world, writes
assets/dragon-pause-animated.webp and assets/dragon-pause-static.png next to
this script. Re-run after tweaking the numbers below:

    python build-dragon-pause.py                    # full build
    python build-dragon-pause.py --preview out.png  # also writes close-ups
"""
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.ndimage import map_coordinates

HERE = Path(__file__).resolve().parent
SRC = HERE.parent.parent / "worlds" / "crimson-tyrant" / "assets" / "dragon-game-paused.png"
OUT = HERE / "assets"

FPS = 12
LOOP_S = 4.0                   # one full pulse; every rhythm below divides into it
FRAMES = int(FPS * LOOP_S)
JAW_DEG = 13.0                 # how wide the jaws are held open
QUALITY = 72

EYE_GLOW = 1.0                 # overall strength of each light
MOUTH_GLOW = 1.0
GEM_GLOW = 1.0

# Positions in the 960x640 painting.
EYE = (607.5, 204.5)
EYE_TILT = 24.0                # degrees the eye slit slopes down to the right
STRAY_EYE = (616.0, 217.0)     # painted-on second eye that gets covered over
HINGE = (574.0, 240.0)         # corner of the mouth; the skull pivots here
MOUTH_LINE = [(574, 240), (605, 264), (620, 286), (640, 301), (652, 318), (668, 323), (760, 332)]
GEMS = [(83, 464, 9, 21), (875, 462, 9, 21), (480, 373, 5, 10), (480, 561, 12, 16)]  # x, y, rx, ry


def smoothstep(a, b, x):
    u = np.clip((x - a) / (b - a), 0.0, 1.0)
    return u * u * (3 - 2 * u)


def blob(x, y, cx, cy, rx, ry, tilt=0.0):
    c, s = math.cos(math.radians(tilt)), math.sin(math.radians(tilt))
    u = (x - cx) * c + (y - cy) * s
    v = -(x - cx) * s + (y - cy) * c
    return np.exp(-((u / rx) ** 2 + (v / ry) ** 2))


def rgb3(r, g, b):
    return np.array([r, g, b], np.float32)


def load_source():
    a = np.asarray(Image.open(SRC).convert("RGBA")).astype(np.float32) / 255.0
    # Cover the stray second eye with scale texture from just below it.
    yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]].astype(np.float32)
    m = smoothstep(1.25, 0.7, np.sqrt(((xx - STRAY_EYE[0]) / 15) ** 2
                                      + ((yy - STRAY_EYE[1]) / 10) ** 2))[..., None]
    return a * (1 - m) + np.roll(a, (-19, -3), axis=(0, 1)) * m


_LX = np.array([p[0] for p in MOUTH_LINE], np.float32)
_LY = np.array([p[1] for p in MOUTH_LINE], np.float32)


def skull_weight(x, y):
    """1 for the upper skull (above the mouth line), 0 for the lower jaw.

    The cut is razor sharp in front of the mouth corner so the jaws part, and
    widens into a soft blend behind it so the cheek and neck stretch instead.
    """
    r = np.sqrt(((x - 585) / 285) ** 2 + ((y - 185) / 250) ** 2)
    head = (1.0 - smoothstep(0.55, 1.0, r)) * smoothstep(385, 500, x + (y - 200) * 0.25)
    behind = np.maximum(HINGE[0] - x, 0.0)
    line = np.where(x >= HINGE[0], np.interp(x, _LX, _LY), HINGE[1] - 0.75 * behind)
    soft = 0.75 + 0.9 * behind
    return smoothstep(-soft, soft, line - y) * head


def open_jaws(src, xx, yy):
    """The still pose: skull lifted off the lower jaw. Returns the image plus
    masks for the mouth opening and where each pixel came from in the painting."""
    def sample(img, cy, cx):
        return map_coordinates(img, [cy, cx], order=1, mode="constant", cval=0.0)

    sk = skull_weight(xx, yy)
    ang = math.radians(JAW_DEG) * sk
    vx, vy = xx - HINGE[0], yy - HINGE[1]
    qx = HINGE[0] + vx * np.cos(ang) - vy * np.sin(ang)
    qy = HINGE[1] + vx * np.sin(ang) + vy * np.cos(ang)
    pose = np.stack([sample(src[..., c], qy, qx) for c in range(4)], axis=-1)

    gap = np.clip((sk - skull_weight(qx, qy)) / np.maximum(sk, 1e-3), 0, 1)
    gap *= smoothstep(HINGE[0] - 4, HINGE[0] + 14, xx)
    # Past the snout tip there is no mouth, only smoke: leave that as painted.
    beyond = (gap * smoothstep(664, 680, xx))[..., None]
    pose = pose * (1 - beyond) + src * beyond
    gap *= (1 - beyond[..., 0]) * src[..., 3]
    pose[..., 3] = np.maximum(pose[..., 3], gap)
    return pose, gap, qx, qy


def build(preview=None):
    src = load_source()
    h, w = src.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    pose, gap, qx, qy = open_jaws(src, xx, yy)
    alpha = pose[..., 3:4]
    g3 = gap[..., None]

    # Throat shaded like a tube: dark at the lips, hottest down the middle.
    is_gap = gap > 0.5
    top = np.where(is_gap, yy, h).min(axis=0)       # per column: upper and lower lip
    bottom = np.where(is_gap, yy, 0).max(axis=0)
    across = np.clip((yy - top[None, :]) / np.maximum(bottom - top, 1.0)[None, :], 0, 1)
    tube = (np.clip(np.sin(np.pi * across), 0, 1) ** 0.8)[..., None]
    along = np.clip((xx - HINGE[0]) / 100.0, 0, 1)[..., None]
    throat_dark = rgb3(0.16, 0.01, 0.02)
    throat_warm = tube * (0.45 + 0.55 * along) * rgb3(1.0, 0.34, 0.04)
    throat_hot = tube ** 2 * rgb3(0.2, 0.55, 0.3)
    spill = blob(xx, yy, 648, 296, 55, 40)[..., None] * (1 - g3)   # light on lips and teeth

    # Eye: brighten the painted slit itself, plus a soft halo around it.
    eye_core = blob(qx, qy, EYE[0], EYE[1], 6.5, 2.6, EYE_TILT)[..., None]
    eye_halo = blob(qx, qy, EYE[0], EYE[1], 15, 9, EYE_TILT)[..., None]

    gem_core = [blob(xx, yy, gx, gy, rx, ry)[..., None] for gx, gy, rx, ry in GEMS]
    gem_halo = [blob(xx, yy, gx, gy, rx * 3.2 + 8, ry * 1.9 + 8)[..., None] for gx, gy, rx, ry in GEMS]

    def wave(t, cycles, phase=0.0):
        """0..1 pulse that repeats `cycles` times per loop, so the loop is seamless."""
        return 0.5 - 0.5 * math.cos(2 * math.pi * (cycles * t / LOOP_S + phase))

    frames = []
    for i in range(FRAMES):
        t = i / FPS
        frame = pose.copy()
        rgb = frame[..., :3]

        # Mouth: slow swell with a faint ember flicker on top.
        mouth = MOUTH_GLOW * (0.35 + 0.65 * wave(t, 1) + 0.06 * math.sin(2 * math.pi * 5 * t / LOOP_S))
        inside = throat_dark + mouth * throat_warm + mouth ** 2 * throat_hot
        rgb[:] = rgb * (1 - g3) + np.clip(inside, 0, 1) * g3
        rgb += rgb * spill * mouth * rgb3(1.0, 0.45, 0.1)

        # Eye: pulses a beat behind the mouth.
        eye = EYE_GLOW * (0.3 + 0.7 * wave(t, 1, -0.12))
        rgb += alpha * eye * (eye_core * (rgb * 1.6 + rgb3(0.7, 0.42, 0.12))
                              + eye_halo * rgb3(0.42, 0.09, 0.02))

        # Gems: same rhythm, each a step out of phase so the light travels round.
        for n, (core, halo) in enumerate(zip(gem_core, gem_halo)):
            gem = GEM_GLOW * (0.15 + 0.85 * wave(t, 1, -0.2 - n * 0.12))
            rgb += alpha * gem * (core * (rgb * 1.5 + rgb3(0.55, 0.13, 0.05))
                                  + halo * rgb3(0.34, 0.04, 0.02))

        frames.append(Image.fromarray((np.clip(frame, 0, 1) * 255 + 0.5).astype(np.uint8)))

    OUT.mkdir(exist_ok=True)
    frames[FRAMES // 4].save(OUT / "dragon-pause-static.png", optimize=True)
    frames[0].save(OUT / "dragon-pause-animated.webp", save_all=True, append_images=frames[1:],
                   duration=round(1000 / FPS), loop=0, quality=QUALITY, method=4,
                   minimize_size=False, allow_mixed=True)
    size = (OUT / "dragon-pause-animated.webp").stat().st_size
    print(f"wrote {FRAMES} frames, {size / 1e6:.2f} MB")

    if preview:
        dim, lit = frames[0], frames[FRAMES // 2 + 4]
        bg = (24, 14, 20)
        face = (540, 150, 720, 350)
        k = 4
        sheet = Image.new("RGB", ((face[2] - face[0]) * k * 2, (face[3] - face[1]) * k), bg)
        for n, f in enumerate((dim, lit)):
            c = f.crop(face).resize(((face[2] - face[0]) * k, (face[3] - face[1]) * k), Image.LANCZOS)
            sheet.paste(c, (n * c.width, 0), c)
        sheet.save(preview)
        full = Image.new("RGB", (w, h * 2), bg)
        full.paste(dim, (0, 0), dim)
        full.paste(lit, (0, h), lit)
        full.save(Path(preview).with_name("full.png"))


if __name__ == "__main__":
    build(sys.argv[sys.argv.index("--preview") + 1] if "--preview" in sys.argv else None)

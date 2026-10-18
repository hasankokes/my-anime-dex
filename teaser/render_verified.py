"""Verified master render.

Chrome occasionally drops a layer or returns a black <OffthreadVideo> frame during `remotion render`,
silently and on different frames each run. `remotion still` (fresh page per frame) has never shown it.
So: render the composition twice, diff every frame (PSNR), re-render the frames that disagree as stills,
compare each still against both renders, and patch the master. Repeat until the two renders agree.

usage: python3 render_verified.py <CompositionId> <out.mov>    (run from teaser/)
"""
import re
import shutil
import subprocess
import sys
from pathlib import Path

COMP, OUT = sys.argv[1], Path(sys.argv[2]).resolve()
ROOT = Path(__file__).parent.resolve()
RM = ROOT / "remotion"
WORK = ROOT / "out" / "verify" / COMP
THRESH = 34.0  # dB; grain and ProRes noise keep identical renders at ≥ 38–40 dB


def sh(cmd, **kw):
    return subprocess.run(cmd, check=True, text=True, capture_output=True, **kw)


def render(dst):
    sh(["npx", "remotion", "render", COMP, str(dst), "--codec=prores", "--prores-profile=hq", "--log=error"], cwd=RM)


def frame_psnr(a, b):
    """Per-frame PSNR between two videos → list of floats."""
    stats = WORK / "psnr.log"
    subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(a), "-i", str(b), "-lavfi", f"[0:v]format=rgb24[x];[1:v]format=rgb24[y];[x][y]psnr=stats_file={stats}", "-f", "null", "-"],
        check=True,
    )
    vals = []
    for line in stats.read_text().splitlines():
        m = re.search(r"psnr_avg:(\S+)", line)
        vals.append(float("inf") if m.group(1) == "inf" else float(m.group(1)))
    return vals


def still(n, dst):
    sh(["npx", "remotion", "still", COMP, str(dst), f"--frame={n}", "--log=error"], cwd=RM)


def frame_png(video, n, dst):
    sh(["ffmpeg", "-v", "error", "-y", "-i", str(video), "-vf", f"select=eq(n\\,{n})", "-frames:v", "1", str(dst)])


def psnr_png(a, b):
    r = subprocess.run(["ffmpeg", "-i", str(a), "-i", str(b), "-lavfi", "[0]format=rgb24[x];[1]format=rgb24[y];[x][y]psnr", "-f", "null", "-"], text=True, capture_output=True)
    m = re.search(r"average:(\S+)", r.stderr)
    return float("inf") if m.group(1) == "inf" else float(m.group(1))


def main():
    WORK.mkdir(parents=True, exist_ok=True)
    a, b = WORK / "A.mov", WORK / "B.mov"
    print(f"[{COMP}] render A"); render(a)
    print(f"[{COMP}] render B"); render(b)
    vals = frame_psnr(a, b)
    bad = [i for i, v in enumerate(vals) if v < THRESH]
    print(f"[{COMP}] {len(vals)} frames, {len(bad)} disagree: {bad}")
    fixes = {}
    for n in bad:
        s, fa, fb = WORK / f"still_{n}.png", WORK / f"a_{n}.png", WORK / f"b_{n}.png"
        still(n, s)
        frame_png(a, n, fa)
        frame_png(b, n, fb)
        pa, pb = psnr_png(s, fa), psnr_png(s, fb)
        print(f"  f{n}: still~A {pa:.1f} dB, still~B {pb:.1f} dB")
        if pa < THRESH:  # A is the broken one at this frame → patch with the still
            fixes[n] = s
    if not fixes:
        shutil.copy(a, OUT)
    else:
        # overlay each verified still onto A at exactly its frame; keep A's audio
        inputs = ["-i", str(a)]
        chain, last = [], "0:v"
        for k, (n, png) in enumerate(sorted(fixes.items()), start=1):
            inputs += ["-i", str(png)]
            chain.append(f"[{last}][{k}:v]overlay=0:0:enable='eq(n\\,{n})'[v{k}]")
            last = f"v{k}"
        sh(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", ";".join(chain), "-map", f"[{last}]", "-map", "0:a?",
            "-c:v", "prores_ks", "-profile:v", "3", "-c:a", "copy", str(OUT)])
    print(f"[{COMP}] patched {sorted(fixes)} → {OUT}")


if __name__ == "__main__":
    main()

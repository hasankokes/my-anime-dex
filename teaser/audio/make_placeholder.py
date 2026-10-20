"""Placeholder bed for the animatic: 120 BPM, 25s, kick on every beat, accent click on
downbeats, soft pad chord per bar so pacing can be judged by ear. Not for release.

usage: .venv/bin/python audio/make_placeholder.py audio/placeholder.wav
"""
import sys

import numpy as np
import soundfile as sf

SR = 48000
BPM = 120
DUR = 25.0
beat = 60 / BPM
t_all = np.arange(int(SR * DUR)) / SR
out = np.zeros((len(t_all), 2))


def add(sig, at, gain=1.0, pan=0.0):
    i = int(at * SR)
    j = min(len(out), i + len(sig))
    l, r = gain * (1 - max(pan, 0)), gain * (1 + min(pan, 0))
    out[i:j, 0] += sig[: j - i] * l
    out[i:j, 1] += sig[: j - i] * r


def kick():
    t = np.arange(int(0.35 * SR)) / SR
    f = 50 + 90 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)


def click(freq):
    t = np.arange(int(0.05 * SR)) / SR
    return np.sin(2 * np.pi * freq * t) * np.exp(-t * 80)


def pad(root, length):
    t = np.arange(int(length * SR)) / SR
    env = np.minimum(1, t / 0.3) * np.minimum(1, (length - t) / 0.4)
    sig = sum(np.sin(2 * np.pi * root * m * t) for m in (1, 1.26, 1.5, 2))
    return sig * env * 0.06


roots = [220, 196, 174.6, 196]  # A G F G
n_beats = int(DUR / beat)
for b in range(n_beats):
    at = b * beat
    if at >= 22.0 and b % 4:  # end card: only downbeats
        continue
    add(kick(), at, 0.8)
    add(click(1760 if b % 4 == 0 else 1320), at, 0.35 if b % 4 == 0 else 0.15)
    if b % 4 == 0:
        add(pad(roots[(b // 4) % 4], beat * 4), at, 1.0)
# 16.5–19s montage: 8th-note hats
for k in range(int(2.5 / (beat / 2))):
    add(click(6000), 16.5 + k * beat / 2, 0.08, pan=0.3)

out /= np.max(np.abs(out)) * 1.12
sf.write(sys.argv[1], out, SR)
print("wrote", sys.argv[1])

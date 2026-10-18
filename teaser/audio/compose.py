"""Original 25s music bed + UI SFX for the MyAnimeDex teaser, synthesized from scratch (numpy/scipy).
No samples, no third-party audio: everything here is generated, so the result is fully owned.

120 BPM, 4/4, A minor (Am–F–C–G). Frame grid: 1 beat = 15 frames @30fps, beat 1 at t=0.
Structure follows docs/shotlist.md:
  0–2s    hook hit + groove start          (S01)
  2–16.5  driving groove, energy rises     (S02–S06)
  16.5–20.5 16th hats + riser              (S07 montage, 8 features × 1 beat)
  19–22   half-time swell                  (S08 payoff)
  22–25   final hit + "dex" chime + tail   (S09 end card)

usage: .venv/bin/python audio/compose.py   → audio/out/{music.wav, sfx.wav, mix.wav}
"""
from pathlib import Path

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

SR = 48000
BPM = 120
BEAT = 60 / BPM
DUR = 26.5  # 795 frames
N = int(SR * DUR)
FPS = 30
rng = np.random.default_rng(7)
OUT = Path(__file__).parent / "out"


def t_(sec):
    return np.arange(int(sec * SR)) / SR


def note(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def lp(x, hz, order=2):
    return sosfilt(butter(order, hz, "low", fs=SR, output="sos"), x)


def hp(x, hz, order=2):
    return sosfilt(butter(order, hz, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x)


class Bus:
    def __init__(self):
        self.x = np.zeros((N, 2))

    def add(self, sig, at, gain=1.0, pan=0.0):
        i = int(round(at * SR))
        if i >= N or i + len(sig) <= 0:
            return
        s = sig if sig.ndim == 2 else np.stack([sig, sig], 1)
        if i < 0:
            s, i = s[-i:], 0
        j = min(N, i + len(s))
        gl, gr = gain * np.sqrt((1 - pan) / 2) * 1.414, gain * np.sqrt((1 + pan) / 2) * 1.414
        self.x[i:j, 0] += s[: j - i, 0] * gl
        self.x[i:j, 1] += s[: j - i, 1] * gr


def reverb(x, secs=1.6, decay=3.5, mix=0.25):
    ir_t = t_(secs)
    irL = rng.standard_normal(len(ir_t)) * np.exp(-ir_t * decay)
    irR = rng.standard_normal(len(ir_t)) * np.exp(-ir_t * decay)
    irL, irR = lp(irL, 7000), lp(irR, 7000)
    irL /= np.sqrt(np.sum(irL**2))
    irR /= np.sqrt(np.sum(irR**2))
    wet = np.stack([fftconvolve(x[:, 0], irL)[:N], fftconvolve(x[:, 1], irR)[:N]], 1)
    return x * (1 - mix) + wet * mix


# ───────────────────────────── instruments ─────────────────────────────
def kick(big=False):
    t = t_(0.5 if big else 0.32)
    f = 42 + 110 * np.exp(-t * 32)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * (5 if big else 9))
    click = hp(rng.standard_normal(len(t)), 2500) * np.exp(-t * 300) * 0.25
    return np.tanh((body + click) * 1.6)


def clap():
    t = t_(0.25)
    n = bp(rng.standard_normal(len(t)), 900, 5000)
    env = sum(np.exp(-np.maximum(t - d, 0) * 60) * (t >= d) for d in (0, 0.009, 0.018)) * 0.5 + np.exp(-t * 18) * 0.5
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30) * 0.3
    return (n * env + tone) * 0.8


def hat(open_=False):
    t = t_(0.18 if open_ else 0.05)
    return hp(rng.standard_normal(len(t)), 7500) * np.exp(-t * (18 if open_ else 90)) * 0.5


def saw(freq, t, detune=0.0, phase=0.0):
    ph = (freq * (1 + detune) * t + phase) % 1.0
    return 2 * ph - 1


def supersaw(freqs, secs, voices=7, spread=0.012, cutoff=2600):
    t = t_(secs)
    out = np.zeros((len(t), 2))
    for fq in freqs:
        for v in range(voices):
            d = spread * (v - (voices - 1) / 2) / ((voices - 1) / 2)
            s = saw(fq, t, d, rng.random())
            pan = (v / (voices - 1)) * 2 - 1
            out[:, 0] += s * (1 - pan) / 2
            out[:, 1] += s * (1 + pan) / 2
    out /= voices * len(freqs)
    return np.stack([lp(out[:, 0], cutoff), lp(out[:, 1], cutoff)], 1)


def pluck(freq, secs=0.22, bright=5000):
    t = t_(secs)
    s = 0.6 * np.sign(np.sin(2 * np.pi * freq * t)) + 0.4 * saw(freq * 2, t)
    return lp(s, bright) * np.exp(-t * 16)


def bass(freq, secs):
    t = t_(secs)
    s = saw(freq, t) * 0.6 + np.sin(2 * np.pi * freq * t) * 0.6
    env = np.minimum(1, t / 0.004) * np.exp(-t * 4)
    return lp(s, 420) * env


def bell(freq, secs=2.2, gain=1.0):
    """'dex' chime: inharmonic bell partials + shimmer."""
    t = t_(secs)
    parts = [(1, 1.0, 2.2), (2.0, 0.5, 3.0), (2.76, 0.35, 4.0), (5.4, 0.2, 6.0), (8.93, 0.1, 9.0)]
    s = sum(a * np.sin(2 * np.pi * freq * r * t) * np.exp(-t * d) for r, a, d in parts)
    return s * np.minimum(1, t / 0.002) * gain * 0.5


def noise_riser(secs, f0=400, f1=9000):
    t = t_(secs)
    n = rng.standard_normal(len(t))
    out = np.zeros(len(t))
    seg = int(0.05 * SR)
    for k in range(0, len(t), seg):
        p = k / len(t)
        fc = f0 * (f1 / f0) ** p
        out[k : k + seg] = bp(n[k : k + seg], fc * 0.7, min(fc * 1.4, SR / 2 - 100))
    return out * (t / secs) ** 2


def whoosh(secs=0.35, up=True):
    t = t_(secs)
    n = rng.standard_normal(len(t))
    out = np.zeros(len(t))
    seg = int(0.01 * SR)
    for k in range(0, len(t), seg):
        p = k / len(t)
        fc = 600 * (8 if up else 1 / 8) ** p if up else 5000 * (1 / 8) ** p
        out[k : k + seg] = bp(n[k : k + seg], max(80, fc * 0.6), min(fc * 1.6, 20000))
    env = np.sin(np.pi * np.clip(t / secs, 0, 1)) ** 2
    return out * env


def click(freq=2200, secs=0.04):
    t = t_(secs)
    return (np.sin(2 * np.pi * freq * t) * 0.7 + hp(rng.standard_normal(len(t)), 4000) * 0.3) * np.exp(-t * 120)


def pop(freq=900):
    t = t_(0.12)
    f = freq * (1 + 0.6 * np.exp(-t * 60))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 35)


def rattle(secs):
    out = np.zeros(int(secs * SR))
    k = 0.0
    while k < secs - 0.05:
        c = click(freq=1200 + rng.random() * 1600, secs=0.03) * (0.4 + rng.random() * 0.6)
        i = int(k * SR)
        out[i : i + len(c)] += c[: len(out) - i]
        k += 0.035 + rng.random() * 0.05
    return out


def sparkle(secs=0.8):
    out = np.zeros(int(secs * SR))
    for _ in range(14):
        b = bell(1800 + rng.random() * 2600, 0.4, 0.15)
        i = int(rng.random() * (secs - 0.4) * SR)
        out[i : i + len(b)] += b
    return out


# ───────────────────────────── arrangement ─────────────────────────────
music = Bus()
chords = [  # Am, F, C, G  (midi)
    (57, [57, 60, 64, 69]),
    (53, [53, 57, 60, 65]),
    (48, [55, 60, 64, 67]),
    (55, [55, 59, 62, 67]),
]
n_beats = int(DUR / BEAT)

for b in range(n_beats):
    at = b * BEAT
    bar, pos = divmod(b, 4)
    root, ch = chords[bar % 4]
    if at < 20.5:  # groove
        music.add(kick(big=b == 0), at, 1.0 if b else 1.25)
        if pos in (1, 3) and at >= 2.0:
            music.add(clap(), at, 0.55)
        hat_gain = 0.16 + 0.1 * min(1, at / 16)
        music.add(hat(), at + BEAT / 2, hat_gain, pan=0.25)
        if 16.5 <= at < 20.5:
            for k in (0.25, 0.75):
                music.add(hat(), at + BEAT * k, 0.14, pan=-0.25)
        # bass 8ths
        for k in (0.0, 0.5):
            music.add(bass(note(root - 12), BEAT * 0.45), at + BEAT * k, 0.75)
        # arp 16ths from 2s, gets brighter
        if at >= 2.0:
            for k in range(4):
                n_ = ch[(pos * 4 + k) % len(ch)] + 12
                music.add(pluck(note(n_), bright=2500 + 4000 * min(1, at / 16)), at + k * BEAT / 4, 0.16, pan=(-0.35 if k % 2 else 0.35))
    if pos == 0 and at < 20.5:  # chord pads per bar, sidechained by kick below
        music.add(supersaw([note(n) for n in ch], BEAT * 4, cutoff=1800 + 2400 * min(1, at / 16)), at, 0.55)

# 19–22s half-time swell: big pad + slow kicks
for i, at in enumerate((20.5, 21.5, 22.5)):  # S08 payoff
    root, ch = chords[i % 4 if i < 2 else 2]
    music.add(supersaw([note(n) for n in ch] + [note(ch[0] + 12)], 1.2, voices=9, spread=0.018, cutoff=3200), at, 1.0)
    music.add(kick(), at, 0.95)
    music.add(bass(note(root - 12), 0.9), at, 0.7)
music.add(noise_riser(4.0), 16.5, 0.35)
music.add(noise_riser(1.0, 800, 12000), 22.5, 0.3)

# 22s final hit + tail
music.add(kick(big=True), 23.5, 1.3)  # S09 start (f705)
music.add(supersaw([note(n) for n in (57, 64, 69, 72, 76)], 3.0, voices=9, spread=0.02, cutoff=4200) * np.linspace(1, 0, int(3.0 * SR))[:, None] ** 2, 23.5, 0.75)
music.add(hp(rng.standard_normal(int(2.0 * SR)), 3000) * np.exp(-t_(2.0) * 2.2) * 0.35, 23.5, 0.6)  # crash

# sidechain: duck pads/bass under kicks (groove section)
duck = np.ones(N)
for b in range(n_beats):
    at = b * BEAT
    if at < 20.5 or at in (20.5, 21.5, 22.5):
        i = int(at * SR)
        L = int(0.22 * SR)
        duck[i : i + L] = np.minimum(duck[i : i + L], 0.35 + 0.65 * (np.arange(min(L, N - i)) / L))
music.x *= duck[:, None] * 0.6 + 0.4
music.x = reverb(music.x, 1.4, 4.0, 0.18)

# ───────────────────────────── SFX cue sheet (global frames) ─────────────────────────────
sfx = Bus()
F = lambda fr: fr / FPS  # noqa: E731
cues = [
    # S01 hook
    (F(0), whoosh(0.3), 0.5, 0.0), (F(1), pop(500), 0.5, 0.0), (F(15), pop(1100), 0.35, -0.3), (F(30), pop(1300), 0.3, 0.3),
    # S02 watching
    (F(58), whoosh(0.3), 0.55, 0.4), (F(75), click(2400), 0.6, 0.2), (F(120), click(2600), 0.6, 0.2),
    # S03 calendar
    (F(148), whoosh(0.3), 0.55, -0.4), (F(165), pop(1000), 0.35, 0.0), (F(195), click(3200, 0.03), 0.5, 0.0),
    # S04 lists
    (F(238), whoosh(0.3), 0.55, 0.4), (F(248), pop(700), 0.45, 0.0), (F(298), click(1800), 0.6, 0.0),
    # S05 profile
    (F(328), whoosh(0.3), 0.55, -0.4), (F(345), bell(1318.5, 1.2, 0.5), 0.35, 0.0),
    # S06 dice
    (F(403), whoosh(0.3), 0.55, 0.4), (F(410), rattle(1.75), 0.45, 0.0), (F(465), pop(800), 0.6, 0.0), (F(465), sparkle(0.9), 0.5, 0.0),
    # S08 payoff
    (F(613), whoosh(0.45, up=False), 0.5, 0.0), (F(660), bell(1760, 1.4, 0.6), 0.35, 0.0),
    # S09 end card: slam + "dex" chime, words, badges
    (F(705), whoosh(0.5), 0.45, 0.0), (F(720), kick(big=True), 0.6, 0.0), (F(720), bell(880, 2.6, 1.0), 0.5, -0.1),
    (F(721), bell(1318.5, 2.4, 0.7), 0.4, 0.15), (F(735), pop(900), 0.3, -0.3), (F(742), pop(1000), 0.3, 0.0),
    (F(750), pop(1200), 0.35, 0.3), (F(755), click(2000), 0.3, -0.2), (F(759), click(2200), 0.3, 0.2),
]
for at, sig, g, pan in cues:
    sfx.add(sig, at, g, pan)
# montage ticks on every cut
for c in range(0, 120, 15):  # one cut per beat
    sfx.add(click(2800 + c * 10, 0.03), F(495 + c), 0.45, 0.3 if c % 2 else -0.3)
sfx.x = reverb(sfx.x, 0.8, 6.0, 0.12)


def master(x, peak_db=-1.0):
    x = np.tanh(x * 1.3) / np.tanh(1.3)
    tail = int(0.03 * SR)
    x[:tail] *= np.linspace(0.85, 1, tail)[:, None]  # avoid a DC click at t=0, keep the hit
    x[-int(0.4 * SR):] *= np.linspace(1, 0, int(0.4 * SR))[:, None] ** 2
    return x / np.max(np.abs(x)) * 10 ** (peak_db / 20)


if __name__ == "__main__":
    import soundfile as sf

    OUT.mkdir(exist_ok=True)
    m = master(music.x.copy(), -3.0)
    s = master(sfx.x.copy(), -3.0)
    mix = master(music.x * 0.85 + sfx.x * 0.9, -1.0)
    sf.write(OUT / "music.wav", m, SR, subtype="PCM_24")
    sf.write(OUT / "sfx.wav", s, SR, subtype="PCM_24")
    sf.write(OUT / "mix.wav", mix, SR, subtype="PCM_24")
    print("wrote", OUT)

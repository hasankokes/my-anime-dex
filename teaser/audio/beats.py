#!/usr/bin/env python3
"""Measure tempo, beats, downbeats and onsets of an audio file for cutting on the beat.

Usage:
    .venv/bin/python audio/beats.py <audio> [--out beats.json] [--fps 30] [--beats-per-bar 4]

Output JSON (times in seconds, frames at --fps):
    tempo, duration, beats, downbeats, onsets, beat_frames, downbeat_frames
Downbeats are every Nth beat starting from the beat with the strongest onset energy
among the first N beats (a heuristic; check by ear and override with --phase if needed).
"""
import argparse
import json
import sys

import librosa
import numpy as np


def analyse(path: str, fps: int, beats_per_bar: int, phase: int | None) -> dict:
    y, sr = librosa.load(path, sr=None, mono=True)
    duration = librosa.get_duration(y=y, sr=sr)

    onset_env = librosa.onset.onset_strength(y=y, sr=sr)
    tempo, beat_idx = librosa.beat.beat_track(onset_envelope=onset_env, sr=sr, units="frames")
    beats = librosa.frames_to_time(beat_idx, sr=sr)
    onsets = librosa.onset.onset_detect(onset_envelope=onset_env, sr=sr, units="time")

    if phase is None:
        strengths = onset_env[beat_idx] if len(beat_idx) else np.array([])
        if len(strengths) >= beats_per_bar:
            # Sum energy per phase across the whole track; the loudest phase is the downbeat.
            per_phase = [strengths[p::beats_per_bar].sum() for p in range(beats_per_bar)]
            phase = int(np.argmax(per_phase))
        else:
            phase = 0
    downbeats = beats[phase::beats_per_bar]

    def to_frames(times):
        return [int(round(t * fps)) for t in times]

    return {
        "file": path,
        "tempo": round(float(np.atleast_1d(tempo)[0]), 2),
        "duration": round(float(duration), 3),
        "fps": fps,
        "beats_per_bar": beats_per_bar,
        "downbeat_phase": phase,
        "beats": [round(float(t), 3) for t in beats],
        "downbeats": [round(float(t), 3) for t in downbeats],
        "onsets": [round(float(t), 3) for t in onsets],
        "beat_frames": to_frames(beats),
        "downbeat_frames": to_frames(downbeats),
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("audio")
    ap.add_argument("--out", default=None, help="write JSON here (default: stdout)")
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--beats-per-bar", type=int, default=4)
    ap.add_argument("--phase", type=int, default=None, help="force downbeat phase (0..beats_per_bar-1)")
    args = ap.parse_args()

    result = analyse(args.audio, args.fps, args.beats_per_bar, args.phase)
    text = json.dumps(result, indent=2)
    if args.out:
        with open(args.out, "w") as f:
            f.write(text + "\n")
        print(f"{result['tempo']} BPM, {len(result['beats'])} beats, "
              f"{len(result['downbeats'])} downbeats -> {args.out}", file=sys.stderr)
    else:
        print(text)
    return 0


if __name__ == "__main__":
    sys.exit(main())

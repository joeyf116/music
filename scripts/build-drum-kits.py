#!/usr/bin/env python3
"""
Builds the Drums page's recorded kits in public/samples/drums/<kit>/ and the sample map in src/lib/drumKits.js
from free, deeply sampled recordings of real drum kits:

  rock   Big Rusty Drums by Karoryfer Samples (oversized 1980s kit, close + overhead mics), CC0
         github.com/sfzinstruments/karoryfer.big-rusty-drums

Each drum keeps several velocity layers (soft to hard hits sound different, not just quieter) and several
round robins (alternate takes, so repeated notes never sound like a machine gun). Close and overhead mics are
mixed like a record, every hit is trimmed to its attack, and each drum keeps the level differences between its
layers so soft hits stay soft.

Only needed when changing the sample set: `python3 scripts/build-drum-kits.py` (needs ffmpeg and numpy).
Sources are pinned to commits, so a rebuild gives the same files. Downloads are cached in .sample-cache/.
"""
import json
import os
import shutil
import subprocess
import sys
import urllib.parse
import urllib.request

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, '.sample-cache')
OUT = os.path.join(ROOT, 'public', 'samples', 'drums')
MAP = os.path.join(ROOT, 'src', 'lib', 'drumKits.js')
RATE = 44100

RUSTY = 'https://raw.githubusercontent.com/sfzinstruments/karoryfer.big-rusty-drums/f07ce00df34a46b6b08375be56fe116cf15782bc/Samples/'


def fetch(url):
    path = os.path.join(CACHE, urllib.parse.quote(url.split('/', 5)[-1], safe=''))
    if not os.path.exists(path):
        os.makedirs(CACHE, exist_ok=True)
        print('  get', url.rsplit('/', 1)[-1], file=sys.stderr)
        with urllib.request.urlopen(urllib.parse.quote(url, safe=':/')) as r, open(path + '.part', 'wb') as f:
            f.write(r.read())
        os.replace(path + '.part', path)
    return path


def decode(path):
    """Any source file -> stereo float32 at RATE."""
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '2', '-ar', str(RATE), '-'],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()


def pan(x, position):
    """Constant-power pan of a (mono-in-stereo) close mic; -1 is the drummer's left."""
    angle = (position + 1) * np.pi / 4
    mono = x.mean(axis=1)
    return np.stack([mono * np.cos(angle), mono * np.sin(angle)], axis=1) * np.sqrt(2)


def mix(parts):
    """Sums (url, gain, pan or None) mic sources, padding to the longest. Mics stay time-aligned."""
    sounds = []
    for url, gain, position in parts:
        x = decode(fetch(url)) * gain
        sounds.append(pan(x, position) if position is not None else x)
    out = np.zeros((max(len(s) for s in sounds), 2), dtype=np.float32)
    for s in sounds:
        out[: len(s)] += s
    return out


def shape(x, length, fade):
    """Starts 1 ms before the attack, cuts to `length` seconds and fades out over the last `fade`."""
    level = np.abs(x).max(axis=1)
    onset = int(np.argmax(level > level.max() * 0.05))
    x = x[max(0, onset - RATE // 1000):][: int(length * RATE)].copy()
    n = min(len(x), int(fade * RATE))
    x[len(x) - n:] *= np.linspace(1, 0, n, dtype=np.float32)[:, None] ** 2
    return x


def encode(x, path, bitrate):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ac', '2', '-ar', str(RATE), '-i', '-',
                    '-c:a', 'libmp3lame', '-b:a', bitrate, path], input=np.ascontiguousarray(x).tobytes(), check=True)


def spread(available, count):
    """`count` layers spread from soft to the hardest, always including the hardest."""
    if len(available) <= count:
        return list(available)
    idx = np.round(np.linspace(len(available) * 0.25, len(available) - 1, count)).astype(int)
    return [available[i] for i in sorted(set(idx))]


# Big Rusty Drums. Each voice: (folder/articulation, file stem, mics [(folder, gain, pan)], velocity layers in
# the source, layers to keep, round robins, length s, fade s, peak level). Pans are from the drummer's seat.
RUSTY_VOICES = {
    'kick': ('kick_24/kick', 'k', [('kick', 1.0, 0), ('oh', 0.55, None)], 14, 4, 3, 0.9, 0.3, 0.95),
    'snare': ('snare_14/center', 'sn_center', [('top', 1.0, 0.05), ('btm', 0.35, 0.05), ('oh', 0.6, None)], 10, 5, 3, 1.1, 0.4, 0.95),
    'rimshot': ('snare_14/rimshot', 'sn_rims', [('top', 1.0, 0.05), ('btm', 0.3, 0.05), ('oh', 0.6, None)], 6, 3, 3, 1.1, 0.4, 0.95),
    'sidestick': ('snare_14/sidestick', 'sn_ss', [('top', 1.0, 0.05), ('oh', 0.6, None)], 4, 3, 3, 0.5, 0.2, 0.7),
    'hihat': ('hihat_14/cl', 'ht_cl', [('cl', 0.8, -0.35), ('oh', 0.8, None)], 6, 4, 3, 0.6, 0.25, 0.55),
    'hihatOpen': ('hihat_14/open', 'ht_open', [('cl', 0.8, -0.35), ('oh', 0.8, None)], 6, 3, 3, 1.8, 0.8, 0.6),
    'hihatPedal': ('hihat_14/chik', 'ht_chik', [('cl', 0.8, -0.35), ('oh', 0.8, None)], 5, 3, 3, 0.5, 0.2, 0.45),
    'tomHigh': ('tom_14/center', 't14', [('cl', 1.0, -0.3), ('oh', 0.6, None)], 6, 4, 3, 1.4, 0.5, 0.85),
    'tomMid': ('tom_15/center', 't15', [('cl', 1.0, -0.1), ('oh', 0.6, None)], 7, 4, 3, 1.5, 0.5, 0.85),
    'tomLow': ('tom_18/center', 't18', [('cl', 1.0, 0.3), ('oh', 0.6, None)], 8, 4, 3, 1.7, 0.6, 0.85),
    'tomFloor': ('tom_22/center', 't22', [('cl', 1.0, 0.45), ('oh', 0.6, None)], 7, 4, 3, 1.9, 0.6, 0.85),
    'ride': ('ride_22/rd', 'rd', [('cl', 0.5, 0.45), ('oh', 1.0, None)], 10, 4, 3, 3.0, 1.2, 0.6),
    'rideBell': ('ride_22/bl', 'rd_bl', [('cl', 0.5, 0.45), ('oh', 1.0, None)], 4, 3, 3, 2.5, 1.0, 0.6),
    'crash': ('crash_17/cr', 'cr', [('cl', 0.4, -0.45), ('oh', 1.0, None)], 5, 3, 3, 3.5, 1.5, 0.7),
}


def build_kit(kit, voices, kit_map):
    out = os.path.join(OUT, kit)
    shutil.rmtree(out, ignore_errors=True)
    os.makedirs(out)
    kit_map[kit] = {}
    total = 0
    for voice, spec in voices.items():
        folder, stem, mics, layers, keep, rrs, length, fade, peak = spec
        chosen = spread(list(range(1, layers + 1)), keep)
        takes = []
        for layer in chosen:
            for rr in range(1, rrs + 1):
                parts = [(f'{RUSTY}{folder}/{mic}/{stem}_vl{layer}_rr{rr}.flac', gain, position) for mic, gain, position in mics]
                takes.append((layer, rr, shape(mix(parts), length, fade)))
        # One gain per drum, so the softer layers keep their real level against the hardest.
        loudest = max(np.abs(x).max() for _, _, x in takes)
        levels = {}
        for layer, rr, x in takes:
            x = x * (peak / loudest)
            levels.setdefault(layer, []).append(float(np.sqrt(np.mean(x ** 2))))
            encode(x, os.path.join(out, f'{voice}-{chosen.index(layer) + 1}-{rr}.mp3'), '112k')
            total += 1
        top = max(np.mean(v) for v in levels.values())
        # `level` is each layer's loudness relative to the hardest (0-1): the engine picks the layer whose
        # level is nearest the step's velocity, so a ghost note plays a genuinely soft take.
        kit_map[kit][voice] = {'layers': [round(float(np.mean(levels[l]) / top), 3) for l in chosen], 'rr': rrs}
        print(f'{kit}/{voice}: {len(chosen)} layers x {rrs}', file=sys.stderr)
    return total


def main():
    kit_map = {}
    files = build_kit('rock', RUSTY_VOICES, kit_map)
    size = sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk(OUT) for f in fs)
    print(f'{files} files, {size / 1e6:.1f} MB', file=sys.stderr)
    # One line per drum keeps the generated file short and its diffs readable.
    body = '{\n' + ',\n'.join(f'  {json.dumps(kit)}: {{\n' + ',\n'.join(f'    {voice}: {json.dumps(spec)}' for voice, spec in voices.items()) + '\n  }'
                               for kit, voices in kit_map.items()) + '\n}'
    with open(MAP, 'w', newline='\n') as f:
        f.write('// Generated by scripts/build-drum-kits.py. Do not edit by hand.\n')
        f.write('// Per kit and drum: each velocity layer\'s loudness relative to the hardest (soft to hard), and the\n')
        f.write('// number of round-robin takes. Files are public/samples/drums/<kit>/<drum>-<layer>-<take>.mp3.\n')
        f.write(f'export const KIT_SAMPLES = {body}\n')


if __name__ == '__main__':
    main()

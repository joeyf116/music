#!/usr/bin/env python3
"""
Builds the backing band's recorded instruments in public/samples/band/ and the sample map in
src/lib/bandSamples.js from free (public domain / CC0 / CC-BY) multi-sampled instruments:

  piano         Splendid Grand Piano (Steinway), public domain       github.com/sfzinstruments/SplendidGrandPiano
  upright bass  D. Smolken 1958 Otto Rubner double bass, pizz, CC0    github.com/sfzinstruments (via danigb/samples)
  electric bass FluidR3 GM "Electric Bass (finger)", CC-BY 3.0        github.com/gleitz/midi-js-soundfonts
  drums         Virtuosity Drums (jazz club kit, sticks), CC0         github.com/sfzinstruments/virtuosity_drums

Only needed when changing the sample set: `python3 scripts/build-band-samples.py` (needs ffmpeg and numpy).
Sources are pinned to commits, so a rebuild gives the same files. Downloads are cached in .sample-cache/.
"""
import json
import os
import re
import subprocess
import sys
import urllib.parse
import urllib.request

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, '.sample-cache')
OUT = os.path.join(ROOT, 'public', 'samples', 'band')
MAP = os.path.join(ROOT, 'src', 'lib', 'bandSamples.js')
RATE = 44100

DANIGB = 'https://raw.githubusercontent.com/danigb/samples/eae8c5c7a10f4b0e06281211e704c36c30e25342/audio/'
VIRTUOSITY = 'https://raw.githubusercontent.com/sfzinstruments/virtuosity_drums/9f04cf9a734527edfbb0a4eee1f674e45bbf71bc/Samples/'
FLUID = 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/044fab8e1456bfafc5776e86dfd6bb8697149aef/FluidR3_GM/'

NOTE = {'c': 0, 'd': 2, 'e': 4, 'f': 5, 'g': 7, 'a': 9, 'b': 11}


def midi(name):
    """'A#2', 'Bb1', 'eb1', 'B-1' -> MIDI number (C4 = 60)."""
    m = re.fullmatch(r'([A-Ga-g])([#b]?)(-?\d)', name)
    pc = NOTE[m.group(1).lower()] + {'#': 1, 'b': -1, '': 0}[m.group(2)]
    return 12 * (int(m.group(3)) + 1) + pc


def fetch(url):
    path = os.path.join(CACHE, urllib.parse.quote(url.split('/', 5)[-1], safe=''))
    if not os.path.exists(path):
        os.makedirs(CACHE, exist_ok=True)
        print('  get', url.rsplit('/', 1)[-1], file=sys.stderr)
        with urllib.request.urlopen(urllib.parse.quote(url, safe=':/')) as r, open(path + '.part', 'wb') as f:
            f.write(r.read())
        os.replace(path + '.part', path)
    return path


def decode(path, channels):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', str(channels), '-ar', str(RATE), '-'],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, channels).copy()


def mix(parts, channels):
    """Sums (path, gain) sources, padding to the longest."""
    sounds = [decode(fetch(url), channels) * gain for url, gain in parts]
    out = np.zeros((max(len(s) for s in sounds), channels), dtype=np.float32)
    for s in sounds:
        out[: len(s)] += s
    return out


def shape(x, length, fade):
    """Starts at the attack (1 ms before it), cuts to `length` seconds and fades out over the last `fade`."""
    level = np.abs(x).max(axis=1)
    onset = int(np.argmax(level > level.max() * 0.03))
    x = x[max(0, onset - RATE // 1000):][: int(length * RATE)].copy()
    n = min(len(x), int(fade * RATE))
    x[len(x) - n:] *= np.linspace(1, 0, n, dtype=np.float32)[:, None] ** 2
    return x


def encode(x, name, bitrate):
    path = os.path.join(OUT, name)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ac', str(x.shape[1]), '-ar', str(RATE), '-i', '-',
                    '-c:a', 'libmp3lame', '-b:a', bitrate, path], input=np.ascontiguousarray(x).tobytes(), check=True)


def group(name, items, bitrate, headroom=0.89):
    """Normalises a whole instrument with one gain (so soft layers stay soft) and writes its files."""
    peak = max(np.abs(x).max() for _, x in items)
    for file, x in items:
        encode(x * (headroom / peak), file, bitrate)
    print(f'{name}: {len(items)} files', file=sys.stderr)


def nearest(available, targets):
    return sorted({min(available, key=lambda n: (abs(n - t), n)) for t in targets})


def build_piano(sample_map):
    index = json.load(open(fetch(DANIGB + 'splendid-grand-piano/samples.json')))
    items, zones = [], {}
    for layer, prefix in (('soft', 'Mp'), ('hard', 'MF')):
        source = next(l for l in index['layers'] if l['name'] == prefix)
        names = {s['midi']: s['url'] + '.m4a' for s in source['samples']}
        chosen = nearest(names, range(36, 92, 3))
        zones[layer] = []
        for note in chosen:
            x = shape(decode(fetch(DANIGB + 'splendid-grand-piano/' + names[note]), 2), 4.2 if note < 60 else 3.4, 0.8)
            items.append((f'piano-{layer}-{note}.mp3', x))
            zones[layer].append(note)
    group('piano', items, '96k')
    sample_map['piano'] = {'layers': [{'velocity': 0, 'notes': zones['soft'], 'file': 'piano-soft-{note}.mp3'},
                                      {'velocity': 0.62, 'notes': zones['hard'], 'file': 'piano-hard-{note}.mp3'}]}


def build_upright(sample_map):
    notes = {'c1': 24, 'eb1': 27, 'g1': 31, 'bb1': 34, 'd2': 38, 'f2': 41, 'a2': 45, 'c3': 48, 'e3': 52, 'g3': 55, 'a3': 57}
    items, layers = [], []
    for layer, dyn, rrs, vel in (('soft', 'm', 'ab', 0), ('hard', 'f', 'ab', 0.72)):
        for name, note in notes.items():
            for rr in rrs:
                url = f'{DANIGB}dsmolken/double-bass/pizz/pizz_{name}_{dyn}{rr}.m4a'
                items.append((f'upright-{layer}-{note}-{rr}.mp3', shape(decode(fetch(url), 1), 2.6, 0.5)))
        layers.append({'velocity': vel, 'notes': list(notes.values()), 'file': f'upright-{layer}-{{note}}-{{rr}}.mp3', 'rr': list(rrs)})
    group('upright bass', items, '64k')
    sample_map['upright'] = {'layers': layers}


def build_electric(sample_map):
    flat = {1: 'Db', 3: 'Eb', 6: 'Gb', 8: 'Ab', 10: 'Bb'}
    name = lambda n: (flat.get(n % 12) or 'C D E F G A B'.split()[[0, 2, 4, 5, 7, 9, 11].index(n % 12)]) + str(n // 12 - 1)
    chosen = list(range(28, 59, 3))
    items = [(f'electric-{n}.mp3', shape(decode(fetch(f'{FLUID}electric_bass_finger-mp3/{name(n)}.mp3'), 1), 2.4, 0.5)) for n in chosen]
    group('electric bass', items, '64k')
    sample_map['electric'] = {'layers': [{'velocity': 0, 'notes': chosen, 'file': 'electric-{note}.mp3'}]}


# Drums: each sound is a blend of the kit's microphones (close mic + overheads + room) like a mixed record.
# `picks` are (velocity layer, round robin) from the source library; layer numbers run soft to loud.
MICS = {
    'kick': [('kickmic', 0.55), ('oh', 0.7), ('room', 0.35)],
    'snare': [('snaremic', 0.5), ('oh', 0.8), ('room', 0.35)],
    'cymbal': [('oh', 1.0), ('room', 0.3)],
    'tom': [('oh', 0.9), ('mid', 0.4), ('room', 0.3)],
}
DRUMS = [
    # voice, folder, articulation, mics, picks, length, fade, rr-in-name
    ('kick', 'kick', 'kick_snon', 'kick', [(1, 1), (1, 2), (2, 1), (2, 2), (3, 1), (3, 2), (4, 1)], 1.0, 0.3, True),
    ('snare', 'snare', 'snare_center', 'snare', [(4, 0), (9, 0), (14, 0), (19, 0), (24, 0), (28, 0), (32, 0), (35, 0)], 1.1, 0.4, False),
    ('ghost', 'snare', 'snare_muted', 'snare', [(2, 0), (5, 0), (8, 0)], 0.5, 0.2, False),
    ('rim', 'snare', 'snare_crossstick', 'snare', [(5, 0), (10, 0), (15, 0)], 0.6, 0.25, False),
    ('ride', 'ride', 'ride_ride', 'cymbal', [(1, 1), (1, 2), (2, 1), (2, 2), (3, 1), (3, 2)], 3.2, 1.4, True),
    ('bell', 'ride', 'ride_bell', 'cymbal', [(2, 1), (3, 1)], 2.5, 1.0, True),
    ('hat', 'hh', 'hh_closed', 'cymbal', [(1, 1), (2, 1), (2, 2), (3, 1), (3, 2), (4, 1)], 0.55, 0.2, True),
    ('hatHalf', 'hh', 'hh_half', 'cymbal', [(2, 1), (3, 1)], 1.0, 0.4, True),
    ('hatOpen', 'hh', 'hh_34', 'cymbal', [(2, 1), (3, 1)], 1.6, 0.6, True),
    ('hatFoot', 'hh', 'hh_pedal', 'cymbal', [(1, 1), (2, 1), (3, 1)], 0.5, 0.2, True),
    ('crash', 'crash', 'crash_crash', 'cymbal', [(2, 1), (3, 1)], 3.6, 1.6, True),
    ('tomHigh', 'htom', 'htom_center', 'tom', [(8, 0), (14, 0)], 1.2, 0.5, False),
    ('tomLow', 'ltom', 'ltom_center', 'tom', [(8, 0), (14, 0)], 1.4, 0.5, False),
]


def build_drums(sample_map):
    items, voices = [], {}
    for voice, folder, art, mics, picks, length, fade, has_rr in DRUMS:
        hits = []
        for vl, rr in picks:
            name = f'{art}_vl{vl}' + (f'_rr{rr}' if has_rr else '')
            parts = [(f'{VIRTUOSITY}{mic}/{folder}/{mic}_{name}.flac', gain) for mic, gain in MICS[mics]]
            x = shape(mix(parts, 2), length, fade)
            hits.append((np.sqrt(np.mean(x[: RATE // 10] ** 2)), x))
        # `level`: each hit's loudness (attack RMS) relative to the loudest hit of the same drum, so the player can
        # pick the recording nearest the loudness it wants and trim the rest with gain.
        top = max(h[0] for h in hits)
        entries = []
        for i, (level, x) in enumerate(hits):
            file = f'drum-{voice}-{i + 1}.mp3'
            items.append((file, x))
            entries.append({'file': file, 'level': round(float(level / top), 3)})
        voices[voice] = sorted(entries, key=lambda e: e['level'])
    group('drums', items, '96k')
    sample_map['drums'] = voices


def main():
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        if f.endswith('.mp3'):
            os.remove(os.path.join(OUT, f))
    sample_map = {}
    build_piano(sample_map)
    build_upright(sample_map)
    build_electric(sample_map)
    build_drums(sample_map)
    body = json.dumps(sample_map, indent=2)
    with open(MAP, 'w', newline='\n') as f:
        f.write('// Generated by scripts/build-band-samples.py: which recorded notes and drum hits live in public/samples/band/.\n')
        f.write('// Piano/bass `notes` are MIDI numbers (each file covers the notes around it); `velocity` is where a layer starts (0..1);\n'
                '// drum `level` is a hit\'s loudness relative to the loudest hit of that drum.\n')
        f.write(f'export const BAND_SAMPLES = {body}\n')
    total = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT))
    print(f'{len(os.listdir(OUT))} files, {total / 1e6:.2f} MB', file=sys.stderr)


if __name__ == '__main__':
    main()

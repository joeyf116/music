#!/usr/bin/env python3
"""
Builds the Drums page's recorded kits in public/samples/drums/<kit>/ and the sample map in src/lib/drumKits.js
from free, deeply sampled recordings of real drum kits:

  rock     Big Rusty Drums by Karoryfer Samples (oversized 1980s kit, close + overhead mics), CC0
           github.com/sfzinstruments/karoryfer.big-rusty-drums
  jazz     Virtuosity Drums by Versilian Studios (jazz club kit, sticks; kick, mid and overhead mics), CC0
           github.com/sfzinstruments/virtuosity_drums
  brushes  Swirly Drums by Karoryfer Samples (indie kit played with brushes, dry + room), CC0
           github.com/sfzinstruments/karoryfer.swirly-drums
  lofi     Gogodze Phu Vol II by Karoryfer Samples (kit recorded through a lo-fi "retro" mic and a front mic), CC0
           github.com/sfzinstruments/karoryfer.gogodze-phu-vol-ii
  perc     Hand percussion from Virtuosity Drums (cowbell, claves, tambourine, shaker, congas, bongos), CC0.
           Shared by every kit.

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
import urllib.error
import urllib.request

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, '.sample-cache')
OUT = os.path.join(ROOT, 'public', 'samples', 'drums')
MAP = os.path.join(ROOT, 'src', 'lib', 'drumKits.js')
RATE = 44100

RUSTY = 'https://raw.githubusercontent.com/sfzinstruments/karoryfer.big-rusty-drums/f07ce00df34a46b6b08375be56fe116cf15782bc/Samples/'
VIRTUOSITY = 'https://raw.githubusercontent.com/sfzinstruments/virtuosity_drums/9f04cf9a734527edfbb0a4eee1f674e45bbf71bc/Samples/'
SWIRLY = 'https://raw.githubusercontent.com/sfzinstruments/karoryfer.swirly-drums/c40dafe0011cb2e54c0c220ff0fa308a11fc60f5/Samples/'
GOGODZE = 'https://raw.githubusercontent.com/sfzinstruments/karoryfer.gogodze-phu-vol-ii/69a0274cdc39c99c3098cde1bc3789690de86d62/Samples/'


def fetch(url):
    path = os.path.join(CACHE, urllib.parse.quote(url.split('/', 5)[-1], safe=''))
    if not os.path.exists(path):
        os.makedirs(CACHE, exist_ok=True)
        print('  get', url.rsplit('/', 1)[-1], file=sys.stderr)
        try:
            with urllib.request.urlopen(urllib.parse.quote(url, safe=':/')) as r, open(path + '.part', 'wb') as f:
                f.write(r.read())
        except urllib.error.HTTPError as err:
            sys.exit(f'{err.code} for {url}')
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


# ---- How each drum is described ----
# A voice is { 'takes': [[take, ...] per velocity layer, soft to hard], 'length', 'fade', 'peak' } where a take is
# the list of mic files mixed into one hit: [(url, gain, pan or None for stereo), ...].


def voice(takes, length, fade, peak):
    return {'takes': takes, 'length': length, 'fade': fade, 'peak': peak}


def grid(path, mics, layers, keep, rrs):
    """Layers x round robins named in the files: `path` has {mic}, {vl} and {rr}; mics are (name, gain, pan)."""
    return [[[(path.format(mic=m, vl=vl, rr=rr), g, p) for m, g, p in mics] for rr in range(1, rrs + 1)]
            for vl in spread(list(range(1, layers + 1)), keep)]


def stacked(path, mics, groups):
    """Libraries that record many single hits soft to hard instead of round robins: each group of neighbouring
    hits becomes one layer, and its hits take turns."""
    return [[[(path.format(mic=m, vl=vl), g, p) for m, g, p in mics] for vl in group] for group in groups]


def named(path, mics, names, rrs):
    """Layers named by velocity range in the file name, e.g. Tumba_24_HitN_1_40_rr3."""
    return [[[(path.format(mic=m, vl=name, rr=rr), g, p) for m, g, p in mics] for rr in range(1, rrs + 1)] for name in names]


# Big Rusty Drums: one folder per articulation and mic. Pans are from the drummer's seat (-1 left).
def rusty(folder, stem, mics, layers, keep, rrs, *shape_args):
    return voice(grid(RUSTY + folder + '/{mic}/' + stem + '_vl{vl}_rr{rr}.flac', mics, layers, keep, rrs), *shape_args)


SNARE_MICS = [('top', 1.0, 0.05), ('btm', 0.35, 0.05), ('oh', 0.6, None)]
HAT_MICS = [('cl', 0.8, -0.35), ('oh', 0.8, None)]
CYM = lambda p: [('cl', 0.5, p), ('oh', 1.0, None)]
TOM = lambda p: [('cl', 1.0, p), ('oh', 0.6, None)]
ROCK = {
    'kick': rusty('kick_24/kick', 'k', [('kick', 1.0, 0), ('oh', 0.55, None)], 14, 4, 3, 0.9, 0.3, 0.95),
    'snare': rusty('snare_14/center', 'sn_center', SNARE_MICS, 10, 5, 3, 1.1, 0.4, 0.95),
    'rimshot': rusty('snare_14/rimshot', 'sn_rims', SNARE_MICS, 6, 3, 3, 1.1, 0.4, 0.95),
    'sidestick': rusty('snare_14/sidestick', 'sn_ss', [('top', 1.0, 0.05), ('oh', 0.6, None)], 4, 3, 3, 0.5, 0.2, 0.7),
    'hihat': rusty('hihat_14/cl', 'ht_cl', HAT_MICS, 6, 4, 3, 0.6, 0.25, 0.55),
    'hihatOpen': rusty('hihat_14/open', 'ht_open', HAT_MICS, 6, 3, 3, 1.8, 0.8, 0.6),
    'hihatPedal': rusty('hihat_14/chik', 'ht_chik', HAT_MICS, 5, 3, 3, 0.5, 0.2, 0.45),
    'tomHigh': rusty('tom_14/center', 't14', TOM(-0.3), 6, 4, 3, 1.4, 0.5, 0.85),
    'tomMid': rusty('tom_15/center', 't15', TOM(-0.1), 7, 4, 3, 1.5, 0.5, 0.85),
    'tomLow': rusty('tom_18/center', 't18', TOM(0.3), 8, 4, 3, 1.7, 0.6, 0.85),
    'tomFloor': rusty('tom_22/center', 't22', TOM(0.45), 7, 4, 3, 1.9, 0.6, 0.85),
    'ride': rusty('ride_22/rd', 'rd', CYM(0.45), 10, 4, 3, 3.0, 1.2, 0.6),
    'rideBell': rusty('ride_22/bl', 'rd_bl', CYM(0.45), 4, 3, 3, 2.5, 1.0, 0.6),
    'crash': rusty('crash_17/cr', 'cr', CYM(-0.45), 5, 3, 3, 3.5, 1.5, 0.7),
}

# Virtuosity Drums: Samples/<mic>/<drum>/<mic>_<drum>_<articulation>_vl<n>[_rr<n>].flac, mics kickmic / mid / oh.
VM = [('mid', 0.45, None), ('oh', 1.0, None)]
VK = [('kickmic', 0.7, None)] + VM


def virt(drum, art, mics, layers=None, keep=4, rrs=None, groups=None, *, length, fade, peak):
    if groups:
        return voice(stacked(VIRTUOSITY + '{mic}/' + drum + '/{mic}_' + art + '_vl{vl}.flac', mics, groups), length, fade, peak)
    return voice(grid(VIRTUOSITY + '{mic}/' + drum + '/{mic}_' + art + '_vl{vl}_rr{rr}.flac', mics, layers, keep, rrs), length, fade, peak)


JAZZ = {
    'kick': virt('kick', 'kick_snon', VK, 4, 4, 3, length=0.9, fade=0.3, peak=0.9),
    'snare': virt('snare', 'snare_center', VM, groups=[[5, 6, 7], [12, 13, 14], [20, 21, 22], [28, 29, 30], [34, 35, 36]], length=1.0, fade=0.4, peak=0.9),
    'rimshot': virt('snare', 'snare_rimshot', VM, groups=[[2, 3, 4], [6, 7, 8], [10, 11, 12]], length=1.0, fade=0.4, peak=0.95),
    'sidestick': virt('snare', 'snare_crossstick', VM, groups=[[3, 4, 5], [9, 10, 11], [14, 15, 16]], length=0.5, fade=0.2, peak=0.7),
    'hihat': virt('hh', 'hh_closed', VM, 4, 4, 3, length=0.6, fade=0.25, peak=0.5),
    'hihatOpen': virt('hh', 'hh_open', VM, 4, 3, 3, length=1.8, fade=0.8, peak=0.55),
    'hihatPedal': virt('hh', 'hh_pedal', VM, 3, 3, 3, length=0.5, fade=0.2, peak=0.45),
    'tomHigh': virt('htom', 'htom_center', VM, groups=[[4, 5, 6], [9, 10, 11], [14, 15, 16]], length=1.4, fade=0.5, peak=0.8),
    'tomFloor': virt('ltom', 'ltom_center', VM, groups=[[4, 5, 6], [9, 10, 11], [14, 15, 16]], length=1.8, fade=0.6, peak=0.8),
    'ride': virt('ride', 'ride_ride', VM, 3, 3, 3, length=3.0, fade=1.2, peak=0.6),
    'rideBell': virt('ride', 'ride_bell', VM, 3, 3, 3, length=2.5, fade=1.0, peak=0.6),
    'crash': virt('crash', 'crash_crash', VM, 3, 3, 3, length=3.5, fade=1.5, peak=0.65),
}

# Swirly Drums (brushes): Samples/[wet/]<drum>/<name>_vl<n>_rr<n>[_top|_btm].wav; the wet copies add the room.
SW = [('', 1.0, None), ('wet/', 0.35, None)]


def swirly(folder, stem, layers, keep=4, rrs=3, suffix='', mics=SW, *, length, fade, peak):
    return voice(grid(SWIRLY + '{mic}' + folder + '/' + stem + '_vl{vl}_rr{rr}' + suffix + '.wav', mics, layers, keep, rrs), length, fade, peak)


SW_SNARE = [('', 1.0, None), ('wet/', 0.35, None)]
BRUSHES = {
    'kick': swirly('kick_buzz', 'buzz_kick_with_snare_buzz', 11, length=0.9, fade=0.3, peak=0.9),
    'snare': voice(
        [[t1 + t2 for t1, t2 in zip(a, b)] for a, b in zip(
            grid(SWIRLY + '{mic}snare_main/snare_hit_vl{vl}_rr{rr}_top.wav', SW_SNARE, 12, 5, 3),
            grid(SWIRLY + '{mic}snare_main/snare_hit_vl{vl}_rr{rr}_btm.wav', [('', 0.3, None)], 12, 5, 3))],
        1.0, 0.4, 0.9),
    'rimshot': swirly('snare_edge', 'snare_edge', 10, 3, suffix='_top', length=1.0, fade=0.4, peak=0.9),
    'hihat': swirly('hat_closed', 'hh_closed', 12, length=0.6, fade=0.25, peak=0.5),
    'hihatOpen': swirly('hat_open', 'hh_open', 14, 3, length=1.8, fade=0.8, peak=0.55),
    'hihatPedal': swirly('hat_foot', 'hh_foot', 9, 3, length=0.5, fade=0.2, peak=0.45),
    'tomHigh': swirly('tom_vhi', 'tom_vhi', 9, 3, length=1.3, fade=0.5, peak=0.8),
    'tomMid': swirly('tom_mhi', 'tom_mhi', 10, 3, length=1.4, fade=0.5, peak=0.8),
    'tomLow': swirly('tom_mlow', 'tom_mlow', 12, 3, length=1.6, fade=0.6, peak=0.8),
    'tomFloor': swirly('tom_floor', 'tom_floor', 12, 3, length=1.8, fade=0.6, peak=0.8),
    'ride': swirly('ride', 'ride', 15, 4, length=3.0, fade=1.2, peak=0.6),
    'crash': swirly('crash', 'crash', 12, 3, length=3.5, fade=1.5, peak=0.65),
}

# Gogodze Phu Vol II: Samples/<mic>_mic/<code>_vl<n>_rr<n>.wav. The retro mic is the lo-fi character; the front
# mic and the close mics keep some weight under it.
def gogo(code, layers, close=None, keep=4, rrs=3, *, length, fade, peak):
    mics = [('retro', 1.0, None), ('front', 0.45, None)] + ([(close, 0.5, None)] if close else [])
    return voice(grid(GOGODZE + '{mic}_mic/' + code + '_vl{vl}_rr{rr}.wav', mics, layers, keep, rrs), length, fade, peak)


LOFI = {
    'kick': gogo('ks', 6, 'kick', length=0.8, fade=0.3, peak=0.95),
    'snare': gogo('sc', 6, 'snare', length=0.9, fade=0.35, peak=0.9),
    'rimshot': gogo('se', 5, 'snare', 3, length=0.9, fade=0.35, peak=0.9),
    'sidestick': gogo('ss', 4, 'snare', 3, length=0.5, fade=0.2, peak=0.7),
    'hihat': gogo('hc', 4, length=0.5, fade=0.2, peak=0.5),
    'hihatOpen': gogo('ho', 5, None, 3, 3, length=1.5, fade=0.7, peak=0.55),
    'hihatPedal': gogo('hf', 3, length=0.4, fade=0.15, peak=0.45),
    'tomHigh': gogo('th', 5, None, 3, length=1.2, fade=0.5, peak=0.8),
    'tomMid': gogo('tm', 5, None, 3, length=1.3, fade=0.5, peak=0.8),
    'tomFloor': gogo('tl', 5, None, 3, length=1.6, fade=0.6, peak=0.8),
}

# Hand percussion (Virtuosity Drums): Samples/perc/<mic>/<folder>/<Name>_v<n>_rr<n>_<Mic>.wav.
PM = [('close', 'Close', 1.0, None), ('oh', 'Overhead', 0.4, None)]


def perc(folder, stem, layers=None, keep=3, rrs=3, names=None, *, length, fade, peak):
    path = VIRTUOSITY + 'perc/{mic}/' + folder + '/' + stem
    mics = [(m, g, p) for m, _, g, p in PM]
    suffix = {m: s for m, s, _, _ in PM}
    def take_url(url, mic):
        return url + '_' + suffix[mic] + '.wav'
    if names:
        layers_ = named(path + '_{vl}_rr{rr}', mics, names, rrs)
    elif layers:
        layers_ = grid(path + '_v{vl}_rr{rr}', mics, layers, keep, rrs)
    else:
        layers_ = [[[(path.format(mic=m) + f'_rr{rr}', g, p) for m, g, p in mics] for rr in range(1, rrs + 1)]]
    # Add each mic's file suffix (_Close / _Room).
    fixed = [[[(take_url(u, m), g, p) for (u, g, p), (m, _, _) in zip(take, mics)] for take in layer] for layer in layers_]
    return voice(fixed, length, fade, peak)


PERC = {
    'cowbell': perc('cowbell', 'Cowbell1_Normal', 3, length=0.8, fade=0.3, peak=0.6),
    'claves': perc('claves', 'Claves1_Hit', 3, length=0.4, fade=0.15, peak=0.6),
    'tambourine': perc('tambourine', 'Tamb1_Shake', rrs=4, length=0.8, fade=0.3, peak=0.5),
    'shaker': perc('shaker', 'LShaker_Shake1D', rrs=4, length=0.4, fade=0.15, peak=0.45),
    'conga': perc('conga', 'Conga_22_HitN', names=['1_50', '51_100', '101_127'], length=1.0, fade=0.4, peak=0.75),
    'congaLow': perc('tumba', 'Tumba_24_HitN', names=['1_40', '41_70', '101_127'], length=1.2, fade=0.5, peak=0.75),
    'bongoHigh': perc('bongoh', 'BongoH_Hit1', 3, length=0.6, fade=0.25, peak=0.7),
    'bongoLow': perc('bongol', 'BongoL_Hit1', 3, length=0.7, fade=0.3, peak=0.7),
}

KITS = {'rock': ROCK, 'jazz': JAZZ, 'brushes': BRUSHES, 'lofi': LOFI, 'perc': PERC}


def build_kit(kit, voices, kit_map):
    out = os.path.join(OUT, kit)
    shutil.rmtree(out, ignore_errors=True)
    os.makedirs(out)
    kit_map[kit] = {}
    total = 0
    for name, spec in voices.items():
        layers = [[shape(mix(take), spec['length'], spec['fade']) for take in layer] for layer in spec['takes']]
        # One gain per drum, so the softer layers keep their real level against the hardest.
        loudest = max(np.abs(x).max() for layer in layers for x in layer)
        levels = []
        for li, layer in enumerate(layers):
            rms = []
            for ti, x in enumerate(layer):
                x = x * (spec['peak'] / loudest)
                rms.append(float(np.sqrt(np.mean(x ** 2))))
                encode(x, os.path.join(out, f'{name}-{li + 1}-{ti + 1}.mp3'), '112k')
                total += 1
            levels.append(np.mean(rms))
        # Order layers soft to hard by measured loudness (sources don't always name them in order).
        order = sorted(range(len(levels)), key=lambda i: levels[i])
        if order != list(range(len(levels))):
            tmp = os.path.join(out, 'tmp')
            os.makedirs(tmp)
            for new, old in enumerate(order):
                for ti in range(len(layers[old])):
                    os.replace(os.path.join(out, f'{name}-{old + 1}-{ti + 1}.mp3'), os.path.join(tmp, f'{name}-{new + 1}-{ti + 1}.mp3'))
            for f in os.listdir(tmp):
                os.replace(os.path.join(tmp, f), os.path.join(out, f))
            os.rmdir(tmp)
            levels = [levels[i] for i in order]
            layers = [layers[i] for i in order]
        top = max(levels)
        takes = min(len(layer) for layer in layers)
        kit_map[kit][name] = {'layers': [round(float(l / top), 3) for l in levels], 'rr': takes}
        print(f'{kit}/{name}: {len(layers)} layers x {takes}', file=sys.stderr)
    return total


def main():
    kit_map = {}
    files = sum(build_kit(kit, voices, kit_map) for kit, voices in KITS.items())
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

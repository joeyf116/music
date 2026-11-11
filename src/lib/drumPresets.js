// Ready-made grooves for the Drums page, grouped by style. See drumLoops.js for how tracks are written:
// '.' rest, 'x' hit, 'X' accent, 'g' ghost. 16-step bars count 1 e & a 2 e & a 3 e & a 4 e & a.

export const STYLES = ['Rock', 'Pop', 'Funk', 'R&B & soul', 'Hip-hop', 'Lo-fi', 'Jazz', 'Latin', 'Afro & Caribbean', 'Electronic', 'Country', 'Blues', 'Punk & metal']

/** The kit a style sounds best on. Picking a groove switches to it (a preset's own `kit` wins); you can change it after. */
export const STYLE_KITS = {
  Rock: 'rock',
  Pop: 'rock',
  Funk: 'rock',
  'R&B & soul': 'lofi',
  'Hip-hop': 'lofi',
  'Lo-fi': 'lofi',
  Jazz: 'jazz',
  Latin: 'jazz',
  'Afro & Caribbean': 'jazz',
  Electronic: 'rock',
  Country: 'rock',
  Blues: 'jazz',
  'Punk & metal': 'rock',
}

export const presetKit = (preset) => preset?.kit ?? STYLE_KITS[preset?.style] ?? 'rock'

const STRAIGHT = { beats: 4, steps: 4, swing: 0 }
const TRIPLET = { beats: 4, steps: 3, swing: 0 }

const BACKBEAT = '....X.......X...'
const EIGHTHS = 'x.x.x.x.x.x.x.x.'

export const PRESETS = [
  // Rock
  { id: 'basic-rock', name: 'Basic rock', style: 'Rock', bpm: 120, ...STRAIGHT, tracks: { hihat: EIGHTHS, snare: BACKBEAT, kick: 'x.......x.x.....' } },
  { id: 'driving-rock', name: 'Driving rock', style: 'Rock', bpm: 132, ...STRAIGHT, tracks: { hihat: 'X.x.X.x.X.x.X.x.', snare: BACKBEAT, kick: 'x.x...x.x.x...x.' } },
  { id: 'open-hat-rock', name: 'Open hat rock', style: 'Rock', bpm: 116, ...STRAIGHT, tracks: { hihatOpen: '..............x.', hihat: 'x.x.x.x.x.x.x...', snare: BACKBEAT, kick: 'x.....x.x.......' } },
  { id: 'sixteenth-hat-rock', name: 'Sixteenth hat rock', style: 'Rock', bpm: 100, ...STRAIGHT, tracks: { hihat: 'XgxgXgxgXgxgXgxg', snare: BACKBEAT, kick: 'x.....x.x.....x.' } },
  { id: 'floor-tom-rock', name: 'Floor tom rock', style: 'Rock', bpm: 110, ...STRAIGHT, tracks: { tomFloor: 'X.x.X.x.X.x.X.x.', snare: BACKBEAT, kick: 'x.......x.x.....' } },
  { id: 'half-time-rock', name: 'Half-time rock', style: 'Rock', bpm: 140, ...STRAIGHT, tracks: { hihat: EIGHTHS, snare: '........X.......', kick: 'x.....x.......x.' } },
  { id: 'ride-rock', name: 'Ride rock', style: 'Rock', bpm: 124, ...STRAIGHT, tracks: { ride: EIGHTHS, snare: BACKBEAT, kick: 'x.......x.x.....' } },
  { id: 'shuffle-rock', name: 'Shuffle rock', style: 'Rock', bpm: 128, ...TRIPLET, tracks: { hihat: 'x.xx.xx.xx.x', snare: '...X.....X..', kick: 'x.....x.x...' } },
  { id: 'tribal-toms', name: 'Tribal tom groove', style: 'Rock', bpm: 112, ...STRAIGHT, tracks: { tomHigh: '..x...x...x..xx.', tomFloor: 'X.x.X.x.X.x.X.x.', snare: BACKBEAT, kick: 'x.......x.......' } },
  { id: 'rock-ballad-128', name: 'Rock ballad (12/8)', style: 'Rock', bpm: 66, ...TRIPLET, tracks: { hihat: 'Xxxxxxxxxxxx', snare: '...X.....X..', kick: 'x.....x.x...' } },
  { id: 'four-floor-rock', name: 'Four-on-the-floor rock', style: 'Rock', bpm: 126, ...STRAIGHT, tracks: { hihat: EIGHTHS, snare: BACKBEAT, kick: 'x...x...x...x...' } },
  { id: 'stomp-clap', name: 'Stomp-stomp-clap', style: 'Rock', bpm: 82, ...STRAIGHT, tracks: { snare: BACKBEAT, kick: 'X.X.....X.X.....' } },
  { id: 'garage-rock', name: 'Garage rock (open hats)', style: 'Rock', bpm: 150, ...STRAIGHT, tracks: { hihatOpen: EIGHTHS, snare: BACKBEAT, kick: 'x.....x.x.......' } },

  // Pop
  { id: 'pop-backbeat', name: 'Pop backbeat', style: 'Pop', bpm: 104, ...STRAIGHT, tracks: { hihat: 'xgxgxgxgxgxgxgxg', snare: BACKBEAT, kick: 'x......xx.......' } },
  { id: 'disco', name: 'Disco', style: 'Pop', bpm: 118, ...STRAIGHT, tracks: { hihatOpen: '..x...x...x...x.', hihat: 'x...x...x...x...', snare: BACKBEAT, kick: 'x...x...x...x...' } },
  { id: 'motown', name: 'Motown', style: 'Pop', bpm: 120, ...STRAIGHT, tracks: { hihat: EIGHTHS, snare: 'X...X...X...X...', kick: 'x.x...x.x.x...x.' } },
  { id: 'tambourine-pop', name: 'Tambourine pop', style: 'Pop', bpm: 112, ...STRAIGHT, tracks: { tambourine: 'x.x.X.x.x.x.X.x.', hihat: EIGHTHS, snare: BACKBEAT, kick: 'x.......x.x.....' } },
  { id: 'pop-ballad', name: 'Pop ballad', style: 'Pop', bpm: 72, ...STRAIGHT, tracks: { hihat: EIGHTHS, sidestick: '....x.......x...', kick: 'x......x..x.....' } },

  // Funk
  { id: 'ghost-note-funk', name: 'Ghost note funk', style: 'Funk', bpm: 96, ...STRAIGHT, tracks: { hihat: 'XxXxXxXxXxXxXxXx', snare: '.g..X..g.g.gX..g', kick: 'x.x.......x..x..' } },
  { id: 'sixteenth-funk', name: 'Sixteenth funk', style: 'Funk', bpm: 100, ...STRAIGHT, tracks: { hihatOpen: '.......x........', hihat: 'x.x.x.x...x.x.x.', snare: '....X.g.g...X.g.', kick: 'x..x..x...x..x..' } },
  { id: 'linear-funk', name: 'Linear funk', style: 'Funk', bpm: 92, ...STRAIGHT, tracks: { hihat: 'x.x...x.x.x...x.', snare: '...gX...g..gX...', kick: '.x...x.x.x...x.x' } },

  // R&B & soul
  { id: 'slow-jam', name: 'R&B slow jam', style: 'R&B & soul', bpm: 66, ...STRAIGHT, swing: 0.56, tracks: { hihat: 'xgxgxgxgxgxgxgxg', snare: BACKBEAT, kick: 'x..x....x.x..x..' } },
  { id: 'sixties-soul', name: 'Sixties soul', style: 'R&B & soul', bpm: 108, ...STRAIGHT, kit: 'rock', tracks: { tambourine: BACKBEAT, hihat: EIGHTHS, snare: BACKBEAT, kick: 'x.x.....x.x.....' } },
  { id: 'gospel-shuffle', name: 'Gospel shuffle', style: 'R&B & soul', bpm: 100, ...TRIPLET, kit: 'rock', tracks: { tambourine: '...x.....x..', hihat: 'x.xx.xx.xx.x', snare: 'g.gXggg.gXgg', kick: 'x..x.xx..x.x' } },
  { id: 'gospel-ballad', name: 'Gospel ballad (12/8)', style: 'R&B & soul', bpm: 64, ...TRIPLET, tracks: { hihat: 'xxxxxxxxxxxx', snare: '...X..g..X.g', kick: 'x....xx.....' } },

  // Hip-hop
  { id: 'boom-bap', name: 'Boom bap', style: 'Hip-hop', bpm: 90, ...STRAIGHT, swing: 0.58, tracks: { hihat: 'x.x.x.x.x.x.x.xg', snare: BACKBEAT, kick: 'x......x..x.....' } },
  { id: 'lazy-hip-hop', name: 'Laid-back hip-hop', style: 'Hip-hop', bpm: 84, ...STRAIGHT, swing: 0.62, tracks: { hihat: 'xgxgxgxgxgxgxgxg', snare: '....X.......X..g', kick: 'x..x......x.x...' } },
  { id: 'neo-soul', name: 'Neo-soul', style: 'Hip-hop', bpm: 78, ...STRAIGHT, swing: 0.6, tracks: { hihat: 'x.x.x.x.x.x.x.x.', sidestick: '....x.......x...', kick: 'x.......x..x..x.' } },

  { id: 'trap', name: 'Trap', style: 'Hip-hop', bpm: 140, ...STRAIGHT, tracks: { hihat: 'x.x.x.x.x.x.xxxx', snare: '........X.......', kick: 'x......x..x....x' } },

  // Lo-fi
  { id: 'lofi-chill', name: 'Lo-fi chill', style: 'Lo-fi', bpm: 76, ...STRAIGHT, swing: 0.6, tracks: { hihat: 'x.x.x.x.x.x.x.x.', snare: BACKBEAT, kick: 'x.....x...x.....' } },
  { id: 'lofi-dusty', name: 'Dusty shaker', style: 'Lo-fi', bpm: 70, ...STRAIGHT, swing: 0.62, tracks: { shaker: 'xgxgxgxgxgxgxgxg', sidestick: BACKBEAT, kick: 'x......x.xx.....' } },
  { id: 'lofi-rimshot', name: 'Late-night rimshot', style: 'Lo-fi', bpm: 82, ...STRAIGHT, swing: 0.58, tracks: { hihat: 'x.xgx.x.x.xgx.xg', rimshot: '....X.......X...', kick: 'x..x......x..x..' } },

  // Jazz (triplet grid: ride "ding, ding-a ding, ding-a")
  { id: 'jazz-ride', name: 'Jazz swing', style: 'Jazz', bpm: 140, ...TRIPLET, tracks: { ride: 'x..x.xx..x.x', hihatPedal: '...x.....x..', kick: 'g..g..g..g..' } },
  { id: 'jazz-ballad', name: 'Jazz ballad (brushes)', style: 'Jazz', kit: 'brushes', bpm: 70, ...TRIPLET, tracks: { ride: 'x..x.xx..x.x', hihatPedal: '...x.....x..', snare: 'g..g.gx..g.g', kick: 'g.....g.....' } },
  { id: 'brush-swing', name: 'Brush swing', style: 'Jazz', bpm: 120, ...TRIPLET, kit: 'brushes', tracks: { snare: 'x.gx.gx.gx.g', hihatPedal: '...x.....x..', kick: 'g..g..g..g..' } },
  { id: 'jazz-waltz', name: 'Jazz waltz', style: 'Jazz', bpm: 150, beats: 3, steps: 3, swing: 0, tracks: { ride: 'x..x.xx..', hihatPedal: '...x..x..', kick: 'g........' } },

  // Latin
  { id: 'bossa-nova', name: 'Bossa nova', style: 'Latin', bpm: 140, ...STRAIGHT, tracks: { hihat: EIGHTHS, sidestick: 'x..x..x...x..x..', kick: 'x..xx..xx..xx..x' } },
  { id: 'samba', name: 'Samba', style: 'Latin', bpm: 100, ...STRAIGHT, tracks: { shaker: 'gxgXgxgXgxgXgxgX', sidestick: 'x..x..x...x..x..', kick: 'x..xx..xx..xx..x' } },
  { id: 'salsa', name: 'Salsa (son clave)', style: 'Latin', bpm: 180, ...STRAIGHT, tracks: { cowbell: 'X.x.X.x.X.x.X.x.', claves: 'x..x..x...x.x...', conga: '....X.......X...', congaLow: '......x.......x.' } },
  { id: 'cha-cha', name: 'Cha-cha-chá', style: 'Latin', bpm: 116, ...STRAIGHT, tracks: { cowbell: 'X...x...X...x...', bongoHigh: 'x.x.x.x.x.x.x.x.', congaLow: '............x.x.', kick: 'x.......x.......' } },
  { id: 'reggaeton', name: 'Reggaeton (dembow)', style: 'Latin', bpm: 94, ...STRAIGHT, kit: 'rock', tracks: { hihat: EIGHTHS, snare: '...x..x....x..x.', kick: 'x...x...x...x...' } },
  { id: 'afro-cuban-6-8', name: 'Afro-Cuban 6/8', style: 'Latin', bpm: 100, beats: 2, steps: 3, swing: 0, tracks: { cowbell: 'x.xx.x', sidestick: '...x..', kick: 'x..x..' } },

  // Afro & Caribbean
  { id: 'reggae-one-drop', name: 'Reggae one drop', style: 'Afro & Caribbean', bpm: 76, ...TRIPLET, tracks: { hihat: 'x.xx.xx.xx.x', rimshot: '......X.....', kick: '......x.....' } },
  { id: 'reggae-steppers', name: 'Reggae steppers', style: 'Afro & Caribbean', bpm: 80, ...STRAIGHT, swing: 0.6, tracks: { hihat: 'x.x.x.x.x.x.x.x.', rimshot: '....X.......X...', kick: 'x...x...x...x...' } },
  { id: 'afrobeat', name: 'Afrobeat', style: 'Afro & Caribbean', bpm: 112, ...STRAIGHT, kit: 'rock', tracks: { hihatOpen: '..x.......x.....', hihat: 'x.xxx.x.x.xxx.x.', snare: 'g..gX..g.g.gX.gg', kick: 'x.....x...x.....' } },
  { id: 'afrobeats', name: 'Afrobeats', style: 'Afro & Caribbean', bpm: 104, ...STRAIGHT, tracks: { shaker: 'xgxgxgxgxgxgxgxg', sidestick: '...x..x....x..x.', kick: 'x..x..x.x..x..x.' } },
  { id: 'soca', name: 'Soca', style: 'Afro & Caribbean', bpm: 124, ...STRAIGHT, kit: 'rock', tracks: { cowbell: '..x...x...x...x.', hihat: EIGHTHS, snare: '...x..X....x..X.', kick: 'x...x...x...x...' } },

  // Electronic (played on real drums, the way a band covers a dance track)
  { id: 'house', name: 'House', style: 'Electronic', bpm: 124, ...STRAIGHT, tracks: { hihatOpen: '..x...x...x...x.', shaker: 'gxgxgxgxgxgxgxgx', snare: BACKBEAT, kick: 'x...x...x...x...' } },
  { id: 'techno', name: 'Techno', style: 'Electronic', bpm: 130, ...STRAIGHT, tracks: { hihatOpen: '..x...x...x...x.', hihat: 'xx.xxx.xxx.xxx.x', kick: 'X...X...X...X...' } },
  { id: 'drum-and-bass', name: 'Drum & bass', style: 'Electronic', bpm: 172, ...STRAIGHT, tracks: { ride: EIGHTHS, snare: '....X..g....X...', kick: 'x.........x.....' } },
  { id: 'breakbeat', name: 'Breakbeat', style: 'Electronic', bpm: 136, ...STRAIGHT, tracks: { hihat: EIGHTHS, snare: '....X..g.g..X..g', kick: 'x.x.......xx....' } },

  // Country
  { id: 'country-two-step', name: 'Country two-step', style: 'Country', bpm: 120, ...STRAIGHT, tracks: { hihat: EIGHTHS, sidestick: BACKBEAT, kick: 'x.......x.......' } },
  { id: 'train-beat', name: 'Train beat (brushes)', style: 'Country', kit: 'brushes', bpm: 150, ...STRAIGHT, tracks: { snare: 'ggxgggXgggxgggXg', kick: 'x.......x.......' } },
  { id: 'waltz', name: 'Country waltz', style: 'Country', bpm: 120, beats: 3, steps: 4, swing: 0, tracks: { hihat: 'x.x.x.x.x.x.', snare: '....x...x...', kick: 'x...........' } },

  // Blues
  { id: 'slow-blues', name: 'Slow blues (12/8)', style: 'Blues', bpm: 60, ...TRIPLET, tracks: { hihat: 'xxxxxxxxxxxx', snare: '...X.....X..', kick: 'x.....x..x..' } },
  { id: 'texas-shuffle', name: 'Texas shuffle', style: 'Blues', bpm: 120, ...TRIPLET, tracks: { ride: 'x.xx.xx.xx.x', snare: 'g.gX.gg.gX.g', kick: 'x..x..x..x..' } },

  // Punk & metal
  { id: 'punk-skank', name: 'Punk skank', style: 'Punk & metal', bpm: 180, ...STRAIGHT, tracks: { crash: 'x.x.x.x.x.x.x.x.', snare: '..X...X...X...X.', kick: 'x...x...x...x...' } },
  { id: 'punk-eighths', name: 'Punk eighths', style: 'Punk & metal', bpm: 170, ...STRAIGHT, tracks: { hihatOpen: EIGHTHS, snare: BACKBEAT, kick: 'x.x...x.x.x...x.' } },
  { id: 'double-kick', name: 'Double-kick metal', style: 'Punk & metal', bpm: 140, ...STRAIGHT, tracks: { ride: 'x...x...x...x...', snare: BACKBEAT, kick: 'xxxxxxxxxxxxxxxx' } },
  { id: 'metal-half-time', name: 'Metal half-time', style: 'Punk & metal', bpm: 100, ...STRAIGHT, tracks: { crash: 'x...x...x...x...', snare: '........X.......', kick: 'x.x.xx....x.xx..' } },
]

export const presetById = (id) => PRESETS.find((p) => p.id === id)

# music

Music resources – a guitar practice site built with **Vite + React**.

**Live site:** https://joeyf116.github.io/music/

## Features

- **Interactive fretboard (22 frets)** – the main feature. Notes are coloured by role
  (root, 3rd, 5th, 7th, other) and can be labelled with note names or intervals.
- **Pick any key** from the 12 key buttons, then choose a mode:
  - **Scales** – major, minor, pentatonics, blues, harmonic/melodic minor and all modes.
    Each scale is split into positions (3-notes-per-string for 7-note scales, boxes for pentatonic/blues).
  - **Chords** – 16 chord types with playable voicings found all the way up the neck.
  - **Inversions** – triads (close voicing) and 7th chords (drop‑2) on every adjacent string set,
    walking root → 1st → 2nd (→ 3rd) inversion up the neck.
- **Tablature under the fretboard** for whatever is selected. Click a column to highlight it on the
  fretboard and hear it, use ← / → to step through, or press **Play** (with adjustable BPM).
- Alternate tunings (Drop D, DADGAD, Open G, Open D, half‑step down).
- **Metronome and drone** next to the tab player – a click at the current BPM and a held root note for the selected key.
- **Exercises page** – generated practice in any key, time signature (2/4 to 12/8) and tuning, with tab that
  plays back in sync (moving cursor, count-in, click, loop and a speed trainer that adds BPM each loop):
  scale sequences (3s, 4s, 3rds, 4ths, 6ths), scales on one string, a subdivision ladder, chromatic finger
  permutations, arpeggios through the key, chord arpeggio shapes, triads on a string set, chord progressions
  (presets, your own Roman numerals or chord names, or random) with strum patterns, and Travis/fingerpicking patterns.
- **Quiz page** – "find the note" on a given string, with score, streak and a fret-range setting.
- Note roles also have shapes (square roots, diamond 7ths) so the fretboard reads without colour.
- Works on phones: 44px touch targets, the neck scrolls to the selected shape, and the tab reflows to the screen width.
- **Practice resources catalog** – PDFs, tabs, lessons, videos and tools that anyone visiting can add to.
  Filter by type, tag, level and category, search every field, sort by newest, star favourites,
  and look a song up on Songsterr / Ultimate Guitar / YouTube with the tab finder.
- **Charts page (iReal Pro style)** – a catalog of chord charts (jazz, blues, pop/rock, latin, traditional
  and practice progressions) that play with a synthesized backing band: drums, bass and piano in
  9 styles (swing, ballad, bossa nova, rock, pop, funk, blues shuffle, jazz waltz, country/folk).
  Transpose to any key, change tempo and style, loop, count in, mix or mute each instrument, and
  start from any bar. **+ New chart** opens an editor (type `Dm7 G7` into a bar box, or paste
  `| C | Am | F G |`); charts can be kept in your browser or shared with everyone
  ([`supabase/README.md`](supabase/README.md)). Built-in charts live in `src/lib/chartLibrary.js`.
- Your last selections are remembered in the browser.

## Adding PDFs and links

See [`resources/README.md`](resources/README.md). In short:

- Drop a PDF (or image, audio, Guitar Pro file…) into `resources/` – sub-folders become categories.
- Add links to `resources/links.json`.
- Or press **+ Add a resource** on the site. With shared links switched on
  ([`supabase/README.md`](supabase/README.md)) everyone sees it straight away.

Push to `main` and the site rebuilds with the new resources.

## Development

```bash
npm install
npm run dev      # start the dev server
npm test         # run unit tests (Vitest)
npm run lint     # lint (oxlint)
npm run build    # production build into dist/
```

Music theory logic (scales, chords, voicings, inversions) lives in `src/lib/theory.js`
with tests in `src/lib/theory.test.js`.

## Deployment (GitHub Pages)

`.github/workflows/deploy.yml` lints, tests and builds on every push/PR and deploys `dist/`
to GitHub Pages on pushes to `main` (or when run manually).

One-time setup: in the repository go to **Settings → Pages** and set **Source** to **GitHub Actions**.

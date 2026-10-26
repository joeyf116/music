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
- **Practice resources** – your PDFs and favourite links, searchable and grouped by category.
- Your last selections are remembered in the browser.

## Adding PDFs and links

See [`resources/README.md`](resources/README.md). In short:

- Drop a PDF (or image, audio, Guitar Pro file…) into `resources/` – sub-folders become categories.
- Add links to `resources/links.json`.

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

<div align="center">

<img src="public/favicon.svg" alt="" width="96">

# Fretboard Practice

**Scales, chords, ear training, exercises and play-along chord charts, all in one guitar practice site.**

[![Deploy to GitHub Pages](https://github.com/joeyf116/music/actions/workflows/deploy.yml/badge.svg)](https://github.com/joeyf116/music/actions/workflows/deploy.yml)
![React 19](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-shared%20catalogs-3ecf8e?logo=supabase&logoColor=white)
![No sign-up](https://img.shields.io/badge/sign--up-not%20needed-f0a033)

### [▶ Open the live site](https://joeyf116.github.io/music/)

<img src="docs/screenshots/fretboard.png" alt="The fretboard page showing A minor pentatonic across 22 frets with tab underneath" width="900">

</div>

---

## Contents

- [What's inside](#whats-inside)
- [Fretboard](#-fretboard)
- [Rhythm](#-rhythm)
- [Training](#-training-ear-and-theory)
- [Charts: play along with a band](#-charts-play-along-with-a-band)
- [Resources](#-resources)
- [Works everywhere](#-works-everywhere)
- [Shared catalogs (Supabase)](#-shared-catalogs-supabase)
- [Design system](#-design-system)
- [Development](#-development)
- [Project layout](#-project-layout)
- [Deployment](#-deployment)

## What's inside

| Page | What it's for |
| --- | --- |
| 🎯 **[Fretboard](https://joeyf116.github.io/music/#fretboard)** | See any scale, chord or inversion on a 22-fret neck, with tab you can play back |
| 🥁 **[Rhythm](https://joeyf116.github.io/music/#exercises)** | A metronome with 12 sounds and 7 subdivisions, strumming rhythms, a timing test, and scale and chord drills in tab |
| 👂 **[Training](https://joeyf116.github.io/music/#quiz)** | Name chord qualities and intervals by ear, and drill building the chords of any key |
| 🎼 **[Charts](https://joeyf116.github.io/music/#charts)** | iReal Pro-style chord charts with a drums, bass and piano backing band, plus a chart editor |
| 📚 **[Resources](https://joeyf116.github.io/music/#resources)** | A shared catalog of lessons, tabs, videos, PDFs and tools anyone can add to |

Each page has its own link, your settings are remembered in the browser, and nothing needs an account. Every page
is laid out the same way: a title and one line on what it's for, the few choices you change most, the thing you
practise with, and a folded **Settings** panel for everything else (see [Design system](#-design-system)).

## 🎯 Fretboard

- **Pick a key and a scale or mode once.** They're shared with the Rhythm page, so drills start where you left off.
- **Explore four ways:**
  - **Scale:** major, minor, pentatonics, blues, harmonic and melodic minor, and every mode, in playable positions (boxes or diagonal 3-notes-per-string runs) or across the whole neck.
  - **Chords:** tap any chord of the key in the *Chords in the key* strip, or pick from 17 chord types, with voicings all the way up the neck.
  - **Inversions:** close triads, plus drop 2 and drop 3 seventh chords, on every string set.
  - **Progressions:** type numerals or chord names (`I V vi IV`, `Am F C G`), start from a common progression, or roll a random one.
- **Notes are coloured and shaped by role** (root, 3rd, 5th, 7th, other), so the neck reads even without colour. Labels can show note names or intervals.
- **Tab under the neck** for whatever is selected. Tap a column to hear it, step through with ← / →, or press **Play** at any BPM, with a metronome and drone beside it.
- **25 tunings** in five groups: standard down to B, drop tunings, open tunings, math rock (FACGCE, open C6, open F) and more. Tuning, labels and "show every note" live in **Neck settings**.
- **Practise it →** opens a matching drill on the Rhythm page.

## 🥁 Rhythm

<img src="docs/screenshots/exercises.png" alt="The Rhythm page with the metronome tab open" width="900">

A rhythm trainer in four tabs:

- **Metronome:** big tempo readout, tap tempo, ±5/±10 nudges, and beat lights you tap to accent or silence. Seven subdivisions (beats, 8ths, triplets, 16ths, swing 8ths, quintuplets, sextuplets), seven natural sounds (woodblock, clave, drumsticks, cowbell, wind-up metronome, drum kit, shaker) and five digital ones. **Trainers** add a gap click (the click drops out for a few bars) and a speed trainer that raises the tempo as you go.
- **Rhythms:** strumming rhythms in six levels on a counting grid with strum arrows, shown as tab too. Listen first, then play along, and tap the rhythm on the pad to see how close you are.
- **Timing:** tap along with the click and see how early or late each tap is, and whether you rush or drag.
- **Drills:** scale sequences, arpeggios, triads on string sets, strummed progressions, technique and fingerstyle patterns, with tab and a fretboard that follow the audio.

## 👂 Training: ear and theory

<img src="docs/screenshots/quiz.png" alt="The Ear training page asking you to name a chord" width="900">

Three tabs, each one question at a time. On the ear tabs press **Play**, listen, pick the answer. Wrong picks stay silent so they're never mistaken for the next question, and once you've answered you can tap every option to compare.

- **Chords:** name the quality. Start with *Major vs minor*, then add triads, sus chords and 7th chords (11 qualities in all). Hear them as an arpeggio, a strum or both, on one root or any root, in close voicing or a real guitar shape, with optional inversions. The answer shows the shape on the neck.
- **Intervals:** the root is shown on the neck and you name the gap. Start with the presets (Starter, + 3rds & 4th, All), play the notes up, down, together or mixed, and set the fret range.
- **Theory:** learn to build chords in a key. *Build* shows a key's scale and you tap the chord's notes (stack every other note), then say whether it's major, minor or diminished. *Name* asks for the 4th chord in E major, or which number Am is in G major. *Spell* asks for the notes of any chord (Spell Bm7♭5) or names a chord from its notes. Triads or 7ths, major, minor or all seven modes, any key or just yours. A wrong tap gets a hint about the method, and every answer shows the working: the formula, the 3rds stacked, and the key's chord pattern (I ii iii IV V vi vii°).
- Score, streak and accuracy per chord or interval, so you know what to practise next.

## 🎼 Charts: play along with a band

<img src="docs/screenshots/charts-player.png" alt="Jazz Blues in F on the Charts page with the band controls above the lead sheet" width="900">

A lead-sheet player inspired by [iReal Pro](https://www.irealpro.com/):

- **A catalog of more than 70 charts:** jazz standards (Autumn Leaves, All the Things You Are, Fly Me to the Moon, Body and Soul…), blues, latin (Blue Bossa, The Girl from Ipanema), pop & rock, folk & country, traditional tunes and practice progressions. You can search it and filter by genre or style.
- **A synthesized backing band** (Web Audio, nothing to download) with drums, walking or patterned bass and voice-led piano in 9 styles: swing, ballad, bossa nova, rock, pop, funk, blues shuffle, jazz waltz and country/folk.
- **Practice controls:** transpose to any key, change the tempo while it plays, loop, count-in, a mixer with volume and mute for each instrument, and tap any bar to start from there. Space plays and stops.
- **Chord shapes:** open the fold-away strip above the chart to see a chord box for every chord, with up to four voicings each (cycle with ‹ ›). Tap a box to hear it. The chord the band is playing is lit, and shapes follow your tuning.
- **A chart editor:** type `Dm7 G7` into a bar box, or paste a whole line like `| C | Am | F G | C |`. `/` holds a chord, `%` repeats a bar and `NC` is a break. It understands symbols like `F#m7b5`, `Bbmaj7`, `G7#9`, `Eb13`, `C/E`, `-7`, `^7`, `ø` and `o7`, and a live band preview plays while you write.
- **Share or keep:** save a chart in your own browser, or share it with everyone. Whoever shared a chart can edit or delete it from the same browser, and anyone can report one.

<details>
<summary><b>How the chart text works</b></summary>

| You type | Means |
| --- | --- |
| `Cmaj7` | One chord for the whole bar |
| `Dm7 G7` | Two chords, two beats each (in 4/4) |
| `C / / A7` | Three beats of C, one of A7 |
| `%` | Repeat the previous bar |
| *(empty)* | Keep the last chord ringing |
| `NC` | No chord: the band rests |
| `C/E` | C with E in the bass |

Built-in charts live in [`src/lib/chartLibrary.js`](src/lib/chartLibrary.js). The 50 seeded shared charts live in [`supabase/seed/popular-charts.js`](supabase/seed/popular-charts.js) (chords and form only, no melody or lyrics).

</details>

## 📚 Resources

A practice catalog of PDFs, tabs, lessons, videos, backing tracks and tools:

- Filter by type, tag, level and category, search every field, sort by newest and star your favourites.
- Look any song up on Songsterr, Ultimate Guitar or YouTube with the tab finder.
- **+ Add a resource** shares a link with every visitor, or keeps it in your own browser.
- Files dropped into [`resources/`](resources/README.md) (sub-folders become categories) and links in `resources/links.json` are bundled with the site.

## 📱 Works everywhere

<img src="docs/screenshots/phone-charts.png" alt="The Charts page on a phone" width="260" align="right">

- Phones get a bottom tab bar within thumb reach and nothing pinned over the top of the page. The main thing on each page (the neck, the quiz, the metronome) comes first; extra options fold away.
- Touch targets are 44px, the neck scrolls to the selected shape, tab reflows to the screen and charts keep four bars to a line.
- Fields never trigger zoom on iOS, contrast meets WCAG AA, and keyboard focus is always visible.
- The site is fully static and works on GitHub Pages or any sub-path.

<br clear="right">

## 🗄️ Shared catalogs (Supabase)

Shared resources and shared charts are stored in a free [Supabase](https://supabase.com) project (`guitar-music`). The site talks to it with plain `fetch`, so there's no SDK to install. The public anon key in [`.env.production`](.env.production) is safe to publish, because database rules decide what it can do:

- Visitors can **read** approved rows, **add** a row, **edit or remove their own** (with a secret token kept in their browser) and **report** a row. A row is hidden automatically after 3 reports.
- Flood limits, length checks, URL and chart-shape checks run in the database.

| File | What it sets up |
| --- | --- |
| [`supabase/schema.sql`](supabase/schema.sql) | Shared resources table and functions |
| [`supabase/charts.sql`](supabase/charts.sql) | Shared charts table and functions |
| [`supabase/seed/popular-charts.sql`](supabase/seed/popular-charts.sql) | The 50 popular charts (generated, see below) |

Setup steps are in [`supabase/README.md`](supabase/README.md). If the database can't be reached, every page still works: shared items are simply hidden.

## 🎨 Design system

All pages follow the rules in [`docs/DESIGN.md`](docs/DESIGN.md): the page anatomy (title and purpose → setup →
stage → folded settings → reference), the spacing, type and colour tokens in [`src/index.css`](src/index.css),
which control to use for which kind of choice, and mobile and accessibility checklists. The shared building blocks
are in [`src/components/layout.jsx`](src/components/layout.jsx) (`PageHeader`, `Disclosure`, `Section`) and
[`src/components/controls.jsx`](src/components/controls.jsx) (`Field`, `Choice`, `Stepper`, `Toggle`). Read it
before adding a page or a control.

## 📱 iPhone, iPad and Android app

[`mobile/`](mobile) is the native app (Expo / React Native) with all five pages rebuilt from the platform's own
controls. It shares the music logic and the page logic in `src/lib` with this site, so a fix there fixes both.
How to run it is in [`mobile/README.md`](mobile/README.md); getting it into the stores is in
[`mobile/PUBLISHING.md`](mobile/PUBLISHING.md).

## 🛠 Development

```bash
npm install
npm run dev          # dev server with hot reload
npm test             # unit tests (Vitest)
npm run lint         # lint (oxlint)
npm run build        # production build into dist/
npm run seed:charts  # rebuild supabase/seed/popular-charts.sql from popular-charts.js
```

To use the shared catalogs locally, copy the two `VITE_SUPABASE_*` lines from `.env.production` into `.env.local` (git-ignored).

## 🗂 Project layout

```text
src/
├── App.jsx                 page list, header and tab bar, shared key / scale / tuning
├── index.css               design tokens, form controls      App.css  page layout and page styles
├── components/
│   ├── layout.jsx          PageHeader, Disclosure, Section (see docs/DESIGN.md)
│   ├── controls.jsx        Field, Choice, Stepper, Toggle
│   ├── FretboardPage.jsx   Fretboard page                   RhythmPage.jsx   Rhythm page and its tabs
│   ├── EarTraining.jsx     Ear training page (ChordQuiz, IntervalQuiz)
│   ├── Charts.jsx          Charts page                      Resources.jsx    Resources page
│   └── …                   widgets: Fretboard, Tab, Metronome, ChordReference, …
└── lib/
    ├── theory.js           notes, scales, chords, voicings, inversions, tunings
    ├── exercises.js        drill generators            player.js        tab playback
    ├── rhythm.js           rhythms, subdivisions, tap grading   clickSounds.js   metronome sounds
    ├── intervalQuiz.js     interval quiz logic         chordQuiz.js     chord quiz logic
    ├── audio.js            plucked-string synth, metronome, drone
    ├── chart.js            chord-symbol parser, transposition, chart compiler
    ├── arranger.js         band styles: drum patterns, bass lines, comping, voicings
    ├── band.js             Web Audio backing band scheduler
    ├── *View.js            page logic shared with the app (exercise fields, rhythm, charts)
    └── shared*.js          Supabase calls for shared resources and charts
docs/DESIGN.md              layout, theme and writing rules for every page (web and app)
mobile/                     the native app (see mobile/README.md)
supabase/                   database SQL and seed data
resources/                  bundled PDFs, files and links
```

The music logic is plain JavaScript with tests next to it (`*.test.js`), separate from the React components.

## 🚀 Deployment

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) lints, tests and builds every push and pull request, then deploys `dist/` to GitHub Pages on pushes to `main`.

One-time setup: **Settings → Pages → Source → GitHub Actions**.

<div align="center">
<sub>Built with React, Vite and the Web Audio API · Happy practising! 🎶</sub>
</div>

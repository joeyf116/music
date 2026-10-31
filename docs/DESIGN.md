# Design system

How every page of Fretboard Practice is laid out, styled and worded. Follow these rules for new pages and
changes so the site stays calm, predictable and quick to use. If a rule gets in the way of something genuinely
better, change the rule here in the same pull request.

**The short version:** one page, one job. Say what the page does in one sentence, put the thing you practise
with in the first screen, give it one obvious main button, and fold everything else into a single
**Settings** drawer that tells you what is set without opening it.

---

## 1. Principles

1. **One page, one job.** Each page answers one question ("what does this scale look like?", "can I hear a
   major 3rd?"). Anything that does not serve that job lives on another page or behind a disclosure.
2. **Play first, configure later.** Every page works the moment it opens with sensible defaults. The main
   action (Play, Start, pick a chart) is never more than one tap away, and no setting has to be touched first.
3. **Fewest taps to the goal.** Common choices are visible as buttons (one tap), not hidden in menus (two
   taps). Rare or advanced choices go behind one disclosure, never behind two.
4. **Show the state, hide the knobs.** A closed Settings drawer still shows its current values
   (`Standard · note names · all notes`), so nobody has to open it to know what is going on.
5. **Remember everything.** Choices persist per browser (`usePersistentState`), and key, scale/mode, tuning
   and tempo are shared across pages so you never set the same thing twice.
6. **Plain guitar words.** Use the terms a teacher would use (Position 3, Drop D, 8th notes), name things the
   same way on every page, and explain anything unusual in a short hint, not a paragraph.
7. **Calm by default.** Colour, weight and motion are spent only where they carry meaning: the main action,
   the current selection, the playing note, right/wrong feedback.

These follow well-established guidance: progressive disclosure (Nielsen Norman Group), Hick's law (more
visible choices means slower decisions), recognition over recall, and the platform touch guidelines from
Apple (44 pt) and Material (48 dp). Sources are listed at the end.

---

## 2. Page anatomy

Every page is built from the same blocks, in this order. Skip blocks a page does not need, but never
reorder them.

```text
┌───────────────────────────────────────────────┐
│ Page header   h1 + one-line purpose │ actions │  PageHeader
├───────────────────────────────────────────────┤
│ Setup         the 1-4 choices that change     │  key, scale, exercise…
│               what you see (big, visible)     │
├───────────────────────────────────────────────┤
│ Stage         the thing you practise with:    │  neck, tab, quiz, chart
│               neck / tab / player + main      │
│               button                          │
├───────────────────────────────────────────────┤
│ Settings ▸    everything else, folded, with   │  Disclosure
│               a summary of current values     │
├───────────────────────────────────────────────┤
│ Reference     related, optional material      │  chords in the key, stats
├───────────────────────────────────────────────┤
│ Hint          one short line of how-to        │  .page-hint
└───────────────────────────────────────────────┘
```

| Block | Rules |
| --- | --- |
| **Page header** (`PageHeader`) | Exactly one `h1` per page. The purpose line is one sentence, under 90 characters, written as what *you* can do ("Hear two notes and name the interval"). At most one primary action on the right (e.g. **+ New chart**) and an optional live status (score). |
| **Setup** | No more than four controls. These are the choices people change most, shown as segmented buttons or key buttons so each change is one tap. |
| **Stage** | Reaches the first screen on a phone wherever possible. Holds the page's single primary button. Wide content (the neck, long tab) scrolls inside its own box, never the page. |
| **Settings** (`Disclosure`) | One per page or per stage, labelled **Settings** (or a specific name such as **Neck settings** when a page has more than one). Shows a value summary when closed. Remembers whether it was open. Never nest a disclosure inside another. |
| **Reference** | Optional extras that support the job (chords in the key, accuracy by interval, chord shapes). Collapsible if taller than about a third of a phone screen. |
| **Hint** | One line, muted, at the end. Keyboard shortcuts only show on devices with a keyboard. |

### Page map

How each page fills the anatomy today. Keep this table up to date when a page changes.

| Page | Job | Setup (always visible) | Stage | Settings (folded) | Reference |
| --- | --- | --- | --- | --- | --- |
| **Fretboard** `#fretboard` | See a scale, chord or inversion on the neck | Key, scale/mode, Explore (Scale · Chords · Inversions · Progressions), position or chord | Neck + note chips, then tab with Play | Neck settings: tuning, note labels, show every note | Chords in the key (picker in chord views, reference at the end for scales) |
| **Rhythm** `#exercises` | Play in time | Tab: Metronome · Rhythms · Timing · Drills | Tempo + Start / the rhythm grid / the tap pad / the drill tab | Sound & volume, Trainers, Playback | How to practise a rhythm |
| **Ear training** `#quiz` | Name chords and intervals by ear | Tab: Chords · Intervals, then a preset row | Play, prompt, answers, Show answer / Skip | Settings: individual chords/intervals, play style, root, voicing, tuning | What each chord sounds like, accuracy |
| **Charts** `#charts` | Play along with a band | Search, style, collection | Chart list → chart with Play, key, tempo, style | Band mix | Chord shapes |
| **Resources** `#resources` | Find something to practise with | Search, sort, type chips | The grouped list | More filters: level, category, tags | Tab finder |

The page title in the header names the page; the tab bar uses the same word (Rhythm, Ear training…), so people
always know where they are.

### Navigation

- Five top-level pages, no more. Each has its own URL hash (`#fretboard`, `#exercises`, …) so it can be
  bookmarked and shared.
- **Phones (< 720 px):** a bottom tab bar with icon + label, within thumb reach, hidden while typing. The
  site title scrolls away with the page. **No sticky top bar**, ever: it covers content in mobile browsers.
- **Wider screens:** title on the left, pages as tabs on the right, not sticky.
- Inside a page, use segmented buttons (`Choice`) for 2-5 views. Do not add a second tab bar.

---

## 3. Layout and spacing

- Content sits on the page background in a centred column up to `--page-max` (1280 px, wide enough for 22 frets) wide, with
  `--page-gutter` side padding (16 px on phones, 24 px from 720 px). **No full-page card.** Cards are only for
  repeated items (a chart, a resource) and for a clearly separate group (the Add form).
- **Never put a card inside a card.** Group with spacing and a heading first, a hairline divider second and a
  box last.
- Spacing comes only from the scale below. Bigger gaps separate blocks, smaller gaps bind related things
  (proximity is how people see groups).
- Containers space their children with `gap`; children never add their own top or bottom margins (a reset in
  `App.css` enforces this for `.page`, `.stage`, tab panels and quizzes).

| Token | Size | Use |
| --- | --- | --- |
| `--space-1` | 4 px | icon to text, inside chips |
| `--space-2` | 8 px | between buttons in a group |
| `--space-3` | 12 px | parts of one stage (title, neck, legend), heading to content |
| `--space-4` | 16 px | between fields, card and disclosure padding, quiz parts |
| `--space-5` | 24 px | between page blocks (`.page` gap), page gutter from 720 px |
| `--space-6` | 32 px | clearance above the phone tab bar |
| `--space-7` | 48 px | rare, large separations |

- Breakpoints: **480 px** (small phone tweaks), **720 px** (tab bar becomes header tabs), **1024 px**
  (multi-column grids). Design at 360 px first and check 390, 768 and 1366.
- Text blocks stay under ~70 characters per line (`max-width: 65ch`).

---

## 4. Typography

System font stack (fast, native, no download). Six sizes only:

| Token | Size | Use |
| --- | --- | --- |
| `--text-xs` | 0.75 rem | badges, fret numbers, tiny labels |
| `--text-sm` | 0.875 rem | field labels, hints, meta text |
| `--text-base` | 1 rem | body text, buttons, inputs |
| `--text-lg` | 1.125 rem | section headings (`h2`) |
| `--text-xl` | 1.375 rem | stage titles (e.g. "A Minor Pentatonic") |
| `--text-2xl` | 1.75 rem (1.5 rem on phones) | page title (`h1`) |

- Weights: 400 body, 600 labels and buttons, 700 headings. No other weights.
- Numbers that change (BPM, score, fret) use `font-variant-numeric: tabular-nums` so they don't jitter.
- Field labels are sentence case, 600 weight, `--muted` colour. Section headings are sentence case too; no
  all-caps except tiny badges.
- Form fields are always at least 16 px so iOS doesn't zoom.

---

## 5. Colour and theme

A dark theme tuned for low glare in a practice room. Every colour is a token in `src/index.css`; components
never use raw hex values except inside the fretboard and tab drawings.

| Token | Role |
| --- | --- |
| `--bg` | page background |
| `--surface` / `--surface-2` | cards, inputs, raised controls |
| `--border` / `--border-strong` | hairlines / input outlines (≥ 3:1 against the background) |
| `--text` / `--muted` | main text / secondary text (both ≥ 4.5:1) |
| `--accent` + `--on-accent` | the primary action, the current selection, focus rings |
| `--success` / `--danger` | right / wrong, errors |
| `--root` `--third` `--fifth` `--seventh` `--other` | note roles on the neck, **only** for notes |

Rules:

- **Accent means "this one".** It marks the primary button, the selected option and focus. Don't use it for
  decoration or headings.
- **One filled accent button per view** (`button.primary`). Secondary buttons use the default `<button>` style,
  tertiary ones are text links (`.link-button`). On/off states that aren't the main action (mute buttons)
  use the soft accent (`--accent-soft`), not a solid fill.
- **Never colour alone.** Note roles also have shapes, right/wrong also has text and an icon, selected
  options are also filled.
- Contrast meets WCAG 2.2 AA: 4.5:1 for text, 3:1 for control outlines and focus rings.

---

## 6. Components and when to use them

All shared controls live in `src/components/controls.jsx` (form controls) and `src/components/layout.jsx`
(`PageHeader`, `Disclosure`, `Section`).

| Need | Use | Notes |
| --- | --- | --- |
| Page title + purpose + main action | `PageHeader` | one per page |
| 2-5 short options | `Choice` (segmented) | labels ≤ 10 characters so they fit a phone |
| 6+ options or long names | native `<select>` inside `Field` | grouped with `<optgroup>` when it helps |
| A number with small steps (BPM) | `Stepper` | type or tap − / + |
| Setting that applies instantly | `Toggle` | not for actions |
| Something that happens (Play, Next) | `<button>` | `.primary` for the main one |
| Advanced or rare options | `Disclosure` | value summary when closed; `storageKey` remembers if it was left open |
| Optional help ("Why practise this?") | `Disclosure quiet` | borderless, muted, one short paragraph or list |
| Any labelled control | `Field` | label above the control, hint in muted text |
| A row of fields | `.field-grid` | wraps from one column on a phone to many on a desktop |

Buttons:

- Verb first, short: **Play**, **Show answer**, **+ Add a resource**. Not "Click here" or "Submit".
- Every button has a visible pressed/hover/focus/disabled state; touch targets are at least 44 × 44 px on
  touch screens.
- Destructive actions (delete a shared chart) ask for confirmation; everything else is instant and undoable.

---

## 7. Writing

- Sentence case everywhere. British spelling in UI copy ("practise" as a verb, "colour").
- Say what something does for the player: "Hear two notes and name the interval", not "Interval quiz module".
- Hints are one line. If something needs a paragraph, put it behind a "Why practise this?" disclosure.
- Empty and error states say what happened and what to do next: "No charts match 'blues'. Clear the search".

---

## 8. Feedback, motion and sound

- Every tap gives a visible response within 100 ms (selected state, playing column, pressed button).
- Live results (score, right/wrong) are announced with `aria-live="polite"`.
- Transitions are 150 ms, used only for state changes, and turned off under `prefers-reduced-motion`.
- Sounds only play because the user asked for them. A wrong answer is silent so it can't be mistaken for the
  next question.

---

## 9. Mobile checklist

Run through this on a 360-390 px wide phone before merging any UI change:

- [ ] No horizontal page scroll (the neck and tab scroll inside their own boxes).
- [ ] The page's purpose and main button are visible without scrolling, or within one short scroll.
- [ ] Touch targets ≥ 44 px, inputs ≥ 16 px text.
- [ ] Nothing is pinned to the top of the screen; the bottom tab bar never covers a focused field.
- [ ] Segmented choices fit their row (or wrap to a clean 2 × 2).
- [ ] Safe-area insets respected on notched phones.

## 10. Accessibility checklist

- [ ] One `h1`, headings in order, landmarks (`header`, `nav`, `main`).
- [ ] Every control has a visible label (or `aria-label` for icon buttons).
- [ ] Focus is always visible and follows the visual order.
- [ ] Contrast AA, information never shown by colour alone.
- [ ] Works with keyboard only; shortcuts are extras, never the only way.

---

## Sources

- Nielsen Norman Group, [Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/)
- Nielsen Norman Group, [Minimize Cognitive Load to Maximize Usability](https://www.nngroup.com/articles/minimize-cognitive-load/)
- Nielsen Norman Group, [Recognition vs. Recall](https://www.nngroup.com/articles/recognition-and-recall/)
- Laws of UX, [Hick's Law](https://lawsofux.com/hicks-law/) and [Law of Proximity](https://lawsofux.com/law-of-proximity/)
- W3C, [WCAG 2.2](https://www.w3.org/TR/WCAG22/) (1.4.3 contrast, 1.4.11 non-text contrast, 2.5.8 target size)
- Apple, [Human Interface Guidelines: Layout](https://developer.apple.com/design/human-interface-guidelines/layout) (44 pt targets)
- Material Design 3, [Accessibility: touch targets](https://m3.material.io/foundations/designing/structure) (48 dp) and [Navigation bar](https://m3.material.io/components/navigation-bar/guidelines) (3-5 destinations)
- Baymard Institute, [Line length readability](https://baymard.com/blog/line-length-readability)

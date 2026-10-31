# Publishing to the App Store and Google Play

Everything in the code is ready for store builds. What's left needs a person with the accounts, so it's listed
here in order. Steps marked **(you)** can only be done by the account owner.

## 1. Accounts (one time)

- [ ] **(you)** Expo account: <https://expo.dev/signup> (free). Builds and submissions run on EAS from there.
- [ ] **(you)** Apple Developer Program: <https://developer.apple.com/programs/enroll/> ($99 a year). Enrol as an
      individual unless the app should show a company name. Approval can take a day or two.
- [ ] **(you)** Google Play Console: <https://play.google.com/console/signup> ($25 once). New personal accounts
      must run a **closed test with at least 12 testers for 14 days** before the app can go to production, so
      start this early.

## 2. Link the project to EAS (one time)

In `mobile/`:

```bash
npx eas-cli@latest login
npx eas-cli@latest init      # adds extra.eas.projectId to app.json: commit it
```

## 3. Store listings

**(you)** create the app in each console with the id `io.github.joeyf116.fretboard`:

- App Store Connect → Apps → **+** → New App (platform iOS, bundle id above, SKU e.g. `fretboard-practice`).
- Play Console → Create app (app, free).

Text you can paste (edit to taste):

- **Name:** Fretboard Practice
- **Subtitle / short description (≤ 30 / 80 chars):** Scales, chords, rhythm and ear training for guitar
- **Description:** See any scale, chord or inversion on the neck in any key and tuning, practise with a
  metronome and strumming rhythms, test your timing, train your ear on chords and intervals, and play along with
  a drums, bass and piano band from chord charts. Find lessons, tabs and tools others have shared.
- **Category:** Music (secondary: Education)
- **Privacy policy URL:** both stores require one. A short page on the GitHub Pages site is enough (see 5).

## 4. Screenshots

Apple needs a 6.9" iPhone set (1320 × 2868) and, because the app supports iPad, a 13" iPad set (2064 × 2752).
Google needs at least 2 phone screenshots plus a 1024 × 500 feature graphic. Take them from a simulator or
device build: one per tab works well (Fretboard, Rhythm, Training, a chart playing, Resources).

## 5. Privacy and content answers

The app has no accounts, ads, analytics or tracking. What it stores and sends:

- Settings, saved charts and saved links stay on the device.
- Charts and links someone chooses to **share** are sent to the shared catalog (Supabase), with a random owner
  token so the sharer can remove them later. Nothing identifies the person.

So: App Store **App Privacy** → "Data not collected" except **User Content → Other user content** (not linked to
the user, not used for tracking). Play **Data safety** → collects "Other user-generated content", optional,
not shared with third parties, encrypted in transit, deletion via the in-app Remove action.

Both stores ask about **user-generated content**: shared items can be **reported** from the app (chart ⋯ menu,
link ⋯ menu) and are hidden automatically after three reports (see `../supabase`). Mention this in the review
notes. Content rating questionnaires: no violence, no gambling, user content present.

Export compliance (iOS) is already answered in `app.json` (`usesNonExemptEncryption: false`).

## 6. Build and submit

```bash
# Android: an .aab signed with a key EAS creates and keeps
npx eas-cli@latest build --platform android --profile production
npx eas-cli@latest submit --platform android      # first upload may need to be done by hand in Play Console

# iOS: EAS creates the certificates after you sign in with your Apple account
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest submit --platform ios          # lands in App Store Connect / TestFlight
```

Then **(you)**: in App Store Connect add the build to the version, fill in review notes and **Submit for
Review**; in Play Console move the build from the closed test to production once the 14 days are up.

## 7. Updates

Bump `version` in `app.json` for each release players should see (build numbers go up automatically), build and
submit again. Changes in `../src/lib` reach the app only through a new build.

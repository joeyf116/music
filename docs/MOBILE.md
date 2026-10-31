# iOS, iPadOS and Android apps

The same React app ships three ways from this repo:

| Where | How it's built | Who it's for |
|---|---|---|
| Web (GitHub Pages) | `npm run build` → `dist/` → [deploy.yml](../.github/workflows/deploy.yml) | Anyone with a browser, unchanged |
| iPhone + iPad (one universal app) | [Capacitor](https://capacitorjs.com) project in `ios/` | App Store |
| Android phones + tablets | Capacitor project in `android/` | Google Play |

Capacitor puts the built `dist/` folder inside a native app shell, so every feature works offline and
nothing has to be written twice. The shared resources/charts catalog still needs a connection (Supabase).

## What's set up already

- **App id** `io.github.joeyf116.fretboard`, name **Fretboard Practice**, version **1.0.0 (build 1)**. Settings in
  [`capacitor.config.json`](../capacitor.config.json). You can change the id until the first upload; after that it is permanent.
- **Icons and splash screens** for every size, generated from `assets/` (`npm run mobile:assets` regenerates them
  if the logo changes).
- **Sound on phones**: one shared Web Audio context, unlocked on the first tap; the iOS app plays through the
  silent switch and mixes with music from other apps (`ios/App/App/AppDelegate.swift`). Safari on the web asks for
  the same with `navigator.audioSession`.
- **Notches and home bars**: the layout already pads with safe-area insets; the status bar uses light text on the dark background.
- **Privacy policy** at <https://joeyf116.github.io/music/privacy.html> (`public/privacy.html`), linked from the footer
  of every page. Both stores require one.
- **iPad**: universal app, all orientations, so it works in Split View.
- **Export compliance**: `ITSAppUsesNonExemptEncryption = false` (the app only uses HTTPS), so App Store Connect
  won't ask about encryption on every build.
- **Android release signing** reads `android/keystore.properties` locally or GitHub secrets in CI.
- **CI** ([mobile.yml](../.github/workflows/mobile.yml)) builds both apps on pull requests that touch native files. Run it by
  hand from the Actions tab to download a test APK (and a signed Play bundle once secrets exist).

## Everyday workflow

```bash
npm run build:mobile   # build the web app and copy it into ios/ and android/
npm run android        # ...then open Android Studio (Windows, Mac or Linux)
npm run ios            # ...then open Xcode (Mac only)
```

Change web code as usual. Re-run `npm run build:mobile` before each native build; the stores need a new build
(and a higher build number) for every update, while the GitHub Pages site updates on every merge as before.

Before each store upload, bump both numbers:

- Android: `versionCode` (+1 every upload) and `versionName` in `android/app/build.gradle`
- iOS: in Xcode, App target → General → Version (`1.0.1`) and Build (`2`)

---

# Store checklist (things only you can do)

## 1. Accounts (once)

- [ ] **Apple Developer Program**: <https://developer.apple.com/programs/enroll/>, $99/year. Individual enrolment
      shows your legal name as the seller; an organisation needs a D-U-N-S number.
- [ ] **Google Play Console**: <https://play.google.com/console/signup>, one-time $25, plus identity verification.
      New *personal* accounts currently must run a **closed test with at least 12 testers for 14 days** before they can publish
      to production, so start this early.

## 2. Android → Google Play (works on your Windows PC)

1. Install [Android Studio](https://developer.android.com/studio). Run `npm ci` then `npm run android`.
2. Try it on a phone: plug in an Android phone with USB debugging on (or use an emulator) and press Run.
   You can also grab the test APK from the **Mobile apps** workflow run in GitHub Actions.
3. Create an upload key **once** and back it up somewhere safe (password manager + a second copy). Losing it means
   asking Google to reset it.
   ```bash
   keytool -genkeypair -v -keystore upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
   ```
   Put `upload.jks` in `android/`, then create `android/keystore.properties` (already git-ignored):
   ```properties
   storeFile=upload.jks
   storePassword=...
   keyAlias=upload
   keyPassword=...
   ```
4. Build the bundle: Android Studio → **Build → Generate Signed App Bundle**, or `cd android && gradlew bundleRelease`.
   The file is `android/app/build/outputs/bundle/release/app-release.aab`.
   *Optional:* to have GitHub build it, add repository secrets `ANDROID_KEYSTORE_BASE64` (the .jks file base64-encoded),
   `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`, then run the **Mobile apps** workflow.
5. In Play Console: **Create app** → fill **App content** (privacy policy URL above; Ads: no; Data safety: see
   below; Target audience: 13+ is simplest; Content rating questionnaire: user-generated content = yes).
6. Upload the `.aab` to **Testing → Closed testing**, add 12+ testers, wait 14 days, then **apply for production**.
   Opt in to **Play App Signing** when asked (recommended).

## 3. iPhone + iPad → App Store (needs a Mac)

You need a Mac with the latest Xcode for the final build and upload. Options if you don't own one: borrow one,
a Mac mini, or a cloud Mac (MacinCloud, AWS EC2 Mac). Everything else is already in the repo.

1. On the Mac: clone the repo, `npm ci`, `npm run ios`. Xcode opens `ios/App/App.xcodeproj`
   (dependencies come through Swift Package Manager, no CocoaPods needed).
2. Xcode → App target → **Signing & Capabilities** → tick *Automatically manage signing* and pick your team.
3. Run it on your iPhone and an iPad simulator. Check the metronome with the silent switch **on**.
4. In [App Store Connect](https://appstoreconnect.apple.com) → **Apps → +**: platform iOS, name *Fretboard Practice*
   (or another name if taken), bundle id `io.github.joeyf116.fretboard`, SKU anything (e.g. `fretboard-practice`).
5. Xcode → **Product → Archive** → **Distribute App → App Store Connect**. The build shows up in TestFlight after a few minutes; try it there.
6. Fill in the listing: description, keywords, support URL (`https://github.com/joeyf116/music/issues` works),
   privacy policy URL, category **Music** (secondary: Education), age rating (answer *yes* to user-generated
   content), screenshots (6.9" iPhone and 13" iPad sizes are required), App Privacy (see below).
7. Submit for review. In **Notes for the reviewer**, mention that it's a guitar practice tool with a metronome,
   ear-training quizzes and a play-along band that work offline, and that shared resources and charts can be reported
   (flag button) and removed. That helps with Apple's "is this just a website?" rule (guideline 4.2) and the
   user-generated content rule (1.2).

## 4. Privacy answers for both stores

The app has no accounts, ads, analytics or tracking. The only data that leaves the device is what a player
chooses to share in the Resources or Charts catalog (titles, links, tags, chord charts) and the reason text of a report.

- **Apple App Privacy**: *Data Not Collected* is accurate if you treat shared catalog entries as public content
  rather than data linked to a person. If you'd rather be cautious, declare **User Content → Other User Content**,
  *not linked to identity*, *not used for tracking*, purpose *App Functionality*.
- **Google Data safety**: *Data collected: User-generated content (other)*, not shared with third parties, processed in transit with
  encryption (HTTPS), optional, purpose *App functionality*; deletion is possible through the in-app remove button
  or a GitHub issue.

## 5. Screenshots and store text

Both stores need screenshots. Run the app in the simulator/emulator (or on your phone) and capture the Fretboard,
Rhythm, Ear training and Charts pages. Google Play also wants a 512×512 icon (`assets/icon-only.png` resized) and
a 1024×500 feature graphic.

Short description idea (80 characters max for Play):
> Scales, chords, metronome, ear training and a play-along band for guitarists.

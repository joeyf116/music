# Shared links (Supabase)

The **+ Add a resource** button on the Resources page can share links with every visitor.
They're stored in a free [Supabase](https://supabase.com) database. Until it's set up, the page
still works and links are saved in the visitor's own browser.

## One-time setup (about 5 minutes)

1. Sign up at https://supabase.com and create a **New project** (the free plan is plenty).
2. Open **SQL Editor → New query**, paste the whole of [`schema.sql`](./schema.sql) and press **Run**.
3. Open **Project Settings → API** (or **Connect**) and copy the **Project URL** and the
   legacy **anon / public** key into [`.env.production`](../.env.production) at the repo root.
4. Push to `main`; the site rebuilds with shared links switched on.

The site's own project (`guitar-music`, ref `uionwltxpdcuwdbrrtrt`) is already set up this way.
For local development the same values work in `.env.local` (git-ignored).

The anon key is designed to be public. The rules in `schema.sql` only let visitors read approved
links, add a link, remove a link they added themselves (from the same browser) and report a link.

## Keeping out spam

- Links must be `http(s)`, fields have length limits, duplicate URLs are refused, and the form has a
  hidden bot trap plus a 30-second cooldown per browser.
- The database refuses new links once 20 have been added in 10 minutes.
- Anyone can press ⚑ to report a link; after 3 reports it's hidden automatically.
- You can always hide (untick **approved**) or delete any row in **Table Editor → resources**.
- Want to approve every link before it shows? Run
  `alter table public.resources alter column approved set default false;`
  in the SQL Editor, then tick **approved** on the ones you want to keep.

## Accounts (log in with Google)

The **Log in** button at the top right opens the Account page (`#account`), which signs people in with
Google through [Supabase Auth](https://supabase.com/docs/guides/auth/social-login/auth-google). There are no
passwords and no emails to send. Run [`accounts.sql`](./accounts.sql) once in the SQL Editor (already done
for `guitar-music`; run it again after it changes, it is safe to re-run): it adds a `profiles` table (one row
per user, made when they first sign in, named from their Google name, readable and editable only by its
owner) and `delete_my_account()` for the Delete account button. The app loads the Supabase client only when
someone opens Account or already has a saved login, so other visitors download nothing extra.

One-time setup:

1. **Google Cloud Console** (console.cloud.google.com): create a project, set up the **OAuth consent
   screen** (External, app name, support email, and the site as the home page), then **Credentials → Create
   credentials → OAuth client ID → Web application** with
   - Authorized JavaScript origins: `https://joeyf116.github.io`
   - Authorized redirect URIs: `https://uionwltxpdcuwdbrrtrt.supabase.co/auth/v1/callback`
2. **Supabase → Authentication → Sign In / Providers → Google**: switch it on and paste the Client ID and
   Client Secret. Switch **Email** off so nobody can sign up with a password through the API.
3. **Supabase → Authentication → URL Configuration**: Site URL `https://joeyf116.github.io/music/`, and add
   `https://joeyf116.github.io/music/**` and `http://localhost:5173/**` to the Redirect URLs.

The Google button reads `/auth/v1/settings` and greys itself out while Google is switched off. Sign-in uses
the PKCE flow (`?code=` in the query), because the site's pages live in the `#hash`.

## Settings that follow your account

[`settings.sql`](./settings.sql) adds `user_settings`: one row per user holding every practice setting the app
saves under `music.*` (key, scale, tuning, tempo, practice tab, starred links, quiz scores, drum loop…) as JSON,
readable and writable only by its owner and deleted with the account. Run it once in the SQL Editor.
`src/lib/settingsSync.js` decides what syncs (drawer open/closed states and anti-spam timers don't) and the rule
for conflicts: the newest save wins, judged by the server's clock. Logging in on a new device brings the
account's settings in; changes are saved two seconds after you make them, and again when you leave the tab.
Until the table exists the app quietly keeps settings in the browser only.

## Shared charts

The Charts page uses the same project for charts anyone can share. Run
[`charts.sql`](./charts.sql) once in the SQL Editor (already done for `guitar-music`). Visitors can read
approved charts, add a chart, edit or remove a chart they shared themselves (from the same browser) and
report a chart; after 3 reports it's hidden. Review or delete rows in **Table Editor → charts**.

### Seeding 50 popular charts

[`seed/popular-charts.sql`](./seed/popular-charts.sql) adds 50 widely played tunes (jazz standards, blues, latin,
pop & rock, folk & country) to the shared catalog, sorted onto genre shelves. Run it once in the SQL Editor
after `charts.sql`; running it again skips titles that are already there. To change the list, edit
[`seed/popular-charts.js`](./seed/popular-charts.js) and run `npm run seed:charts` to regenerate the SQL.

If the catalog was seeded before a chord fix to `popular-charts.js`, run the matching fix file once as well
(for example [`seed/accuracy-fixes.sql`](./seed/accuracy-fixes.sql)); it only updates the seeded copies.

## Community board

The Community page (`#community`) is a simple board: logged-in people post what they're working on or need
help with, and reply to each other. Anyone can read it. Run [`community.sql`](./community.sql) once in the
SQL Editor, after `accounts.sql` (safe to re-run). It adds `board_posts` (posts and one level of replies)
and `board_reports`.

- The database fills in the author and their name (profile name, then Google name), so nobody can post as
  someone else. Renaming yourself on the Account page renames your posts. Emails are never shown.
- People can delete their own posts; Delete account removes all of them.
- Each person can post 10 times in 10 minutes. Logged-in people can report a post once; after 3 reports
  it's hidden. To bring one back, untick **hidden** and set **reports** to 0 in **Table Editor → board_posts**,
  or delete the row.

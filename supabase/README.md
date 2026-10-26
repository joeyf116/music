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

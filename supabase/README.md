# Shared links (Supabase)

The **+ Add a resource** button on the Resources page can share links with every visitor.
They're stored in a free [Supabase](https://supabase.com) database. Until it's set up, the page
still works and links are saved in the visitor's own browser.

## One-time setup (about 5 minutes)

1. Sign up at https://supabase.com and create a **New project** (the free plan is plenty).
2. Open **SQL Editor → New query**, paste the whole of [`schema.sql`](./schema.sql) and press **Run**.
3. Open **Project Settings → API** (or **Connect**) and copy the **Project URL** and the
   **anon / public** key.
4. In GitHub go to the repository's **Settings → Secrets and variables → Actions → Variables** and add
   two repository variables:
   - `SUPABASE_URL` = the Project URL
   - `SUPABASE_ANON_KEY` = the anon key
5. Re-run the **Deploy to GitHub Pages** workflow (Actions tab → Run workflow), or push anything to `main`.

For local development put the same two values in a `.env.local` file (it's git-ignored):

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

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

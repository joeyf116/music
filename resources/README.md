# Practice resources

Everything in this folder shows up on the **Resources** page of the site, together with links
visitors share from the page itself (see [`supabase/README.md`](../supabase/README.md)).

## Add a PDF (or image, audio, Guitar Pro file…)

1. Drop the file in this folder, e.g. `resources/caged-system.pdf`.
2. Optionally put it in a sub-folder to group it: `resources/Scales/modes-cheatsheet.pdf`
   shows up under a **Scales** heading.
3. Commit and push – the GitHub Pages workflow rebuilds the site and the file is listed
   automatically (the title comes from the file name, `caged-system.pdf` → "Caged System").

Supported: `pdf, png, jpg, jpeg, gif, webp, svg, txt, md, gp, gp3, gp4, gp5, gpx, mp3, wav, m4a, ogg, mid, midi, musicxml, mxl`.

## Add a link

Add an entry to [`links.json`](./links.json):

```json
{
  "title": "My favourite lesson",
  "url": "https://example.com/lesson",
  "category": "Lessons",
  "type": "Lesson",
  "level": "Beginner",
  "tags": ["strumming", "rhythm"],
  "description": "Optional short note"
}
```

- `type` is one of `Tab, Lesson, Video, Backing track, Tool, Article, PDF, Other`
  (left out, it's guessed from the URL: YouTube is a Video, Songsterr/Ultimate Guitar a Tab, `.pdf` a PDF).
- `level` is optional: `Beginner`, `Intermediate` or `Advanced`.
- `tags` power the tag filter on the page; keep them short and lower-case.
- Only `http(s)` URLs are accepted.

Files get their sub-folder names as tags, and Guitar Pro / MusicXML files are listed as Tabs.

> Links added on the site with **Just me** stay in that browser only. Links added with
> **Everyone** are shared with every visitor (once shared links are switched on).

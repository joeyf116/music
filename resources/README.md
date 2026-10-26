# Practice resources

Everything in this folder shows up on the **Resources** page of the site (top navigation).

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
  "description": "Optional short note"
}
```

Only `http(s)` URLs are accepted.

> Tip: the **Quick-save a link** form on the site stores links in your browser only –
> add them here to keep them permanently and on every device.

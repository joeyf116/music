-- Fixes from the music-accuracy review (2026-10-26) for charts already seeded into the shared catalog.
-- Run once in the Supabase SQL Editor. Only touches the seeded copies (no owner), so visitors' charts are left alone.
-- popular-charts.js / popular-charts.sql already carry the same fixes for fresh installs.

-- Autumn Leaves: Last eight bars: the Fm7 E7 chromatic ii-V resolves to Ebmaj7, then Am7b5 D7 back to Gm (was Fm7 E7 straight into Am7b5).
update public.charts set key = 'Gm', sections = '[{"label":"A","bars":["Cm7","F7","Bbmaj7","Ebmaj7","Am7b5","D7b9","Gm6","%"]},{"label":"A","bars":["Cm7","F7","Bbmaj7","Ebmaj7","Am7b5","D7b9","Gm6","%"]},{"label":"B","bars":["Am7b5","D7b9","Gm6","%","Cm7","F7","Bbmaj7","Ebmaj7","Am7b5","D7b9","Gm7 Gb7","Fm7 E7","Ebmaj7","Am7b5 D7b9","Gm6","%"]}]'::jsonb, updated_at = now()
where title = 'Autumn Leaves' and owner_token is null;

-- Misty: Bridge ends with the chain of ii-Vs Gm7 C7 | Cm7 F7 | Fm7 Bb7 back to Eb (was Gm7b5 C7b9 | Fm7 | Bb7).
update public.charts set key = 'Eb', sections = '[{"label":"A","bars":["Ebmaj7","Bbm7 Eb7","Abmaj7","Abm7 Db7","Ebmaj7 Cm7","Fm7 Bb7","Gm7 C7","Fm7 Bb7"]},{"label":"A","bars":["Ebmaj7","Bbm7 Eb7","Abmaj7","Abm7 Db7","Ebmaj7 Cm7","Fm7 Bb7","Eb6","Bbm7 Eb7"]},{"label":"B","bars":["Bbm7","Eb7b9","Abmaj7","%","Am7 D7","Gm7 C7","Cm7 F7","Fm7 Bb7"]},{"label":"A","bars":["Ebmaj7","Bbm7 Eb7","Abmaj7","Abm7 Db7","Ebmaj7 Cm7","Fm7 Bb7","Eb6","Fm7 Bb7"]}]'::jsonb, updated_at = now()
where title = 'Misty' and owner_token is null;

-- Body and Soul: The tune is in Db, not C# (every chord is written in flats).
update public.charts set key = 'Db', sections = '[{"label":"A","bars":["Ebm7 Bb7b9","Ebm7 D7","Dbmaj7 Gb7","Fm7 Edim7","Ebm7 / Cm7b5 F7","Bbm7 Eb7","Ebm7 Ab7","Db6 Bb7"]},{"label":"A","bars":["Ebm7 Bb7b9","Ebm7 D7","Dbmaj7 Gb7","Fm7 Edim7","Ebm7 / Cm7b5 F7","Bbm7 Eb7","Ebm7 Ab7","Db6 A7"]},{"label":"B","bars":["Dmaj7","Em7 / Gm7 C7","F#m7 Bm7","Em7 A7","Dmaj7","Dm7 G7","Cmaj7 Ebdim7 Dm7 G7","C7 B7 Bb7 /"]},{"label":"A","bars":["Ebm7 Bb7b9","Ebm7 D7","Dbmaj7 Gb7","Fm7 Edim7","Ebm7 / Cm7b5 F7","Bbm7 Eb7","Ebm7 Ab7","Db6 Bb7"]}]'::jsonb, updated_at = now()
where title = 'Body and Soul' and owner_token is null;


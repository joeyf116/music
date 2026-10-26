// The 50 charts seeded into the shared catalog (supabase/seed/popular-charts.sql is generated from this
// file by `npm run seed:charts`). Chords and form only, in common jam-session versions: no melody or lyrics.
// Pop songs played with a capo are written in the chord shapes guitarists use.
const c = (collection, title, composer, style, key, time, tempo, sections) => ({ collection, title, composer, style, key, time, tempo, sections })
const S = (label, ...bars) => ({ label, bars })

export const POPULAR_CHARTS = [
  // ---- Jazz ----
  c('Jazz', 'Autumn Leaves', 'Joseph Kosma', 'swing', 'Gm', '4/4', 140, [
    S('A', 'Cm7', 'F7', 'Bbmaj7', 'Ebmaj7', 'Am7b5', 'D7b9', 'Gm6', '%'),
    S('A', 'Cm7', 'F7', 'Bbmaj7', 'Ebmaj7', 'Am7b5', 'D7b9', 'Gm6', '%'),
    S('B', 'Am7b5', 'D7b9', 'Gm6', '%', 'Cm7', 'F7', 'Bbmaj7', 'Ebmaj7', 'Am7b5', 'D7b9', 'Gm7 Gb7', 'Fm7 E7', 'Ebmaj7', 'Am7b5 D7b9', 'Gm6', '%'),
  ]),
  c('Jazz', 'All the Things You Are', 'Jerome Kern', 'swing', 'Ab', '4/4', 160, [
    S('A', 'Fm7', 'Bbm7', 'Eb7', 'Abmaj7', 'Dbmaj7', 'G7', 'Cmaj7', '%'),
    S('A', 'Cm7', 'Fm7', 'Bb7', 'Ebmaj7', 'Abmaj7', 'D7', 'Gmaj7', '%'),
    S('B', 'Am7', 'D7', 'Gmaj7', '%', 'F#m7b5', 'B7', 'Emaj7', 'C7#5'),
    S('A', 'Fm7', 'Bbm7', 'Eb7', 'Abmaj7', 'Dbmaj7', 'Dbm7', 'Cm7', 'Bdim7', 'Bbm7', 'Eb7', 'Abmaj7', 'Gm7b5 C7b9'),
  ]),
  c('Jazz', 'Solar', 'Miles Davis', 'swing', 'Cm', '4/4', 160, [
    S('A', 'Cm(maj7)', '%', 'Gm7', 'C7', 'Fmaj7', '%', 'Fm7', 'Bb7', 'Ebmaj7', 'Ebm7 Ab7', 'Dbmaj7', 'Dm7b5 G7b9'),
  ]),
  c('Jazz', 'Fly Me to the Moon', 'Bart Howard', 'swing', 'C', '4/4', 120, [
    S('A', 'Am7', 'Dm7', 'G7', 'Cmaj7 C7', 'Fmaj7', 'Bm7b5', 'E7b9', 'Am7 A7'),
    S('B', 'Dm7', 'G7', 'Cmaj7', 'Am7', 'Dm7', 'G7', 'Cmaj7', 'Bm7b5 E7'),
    S('A', 'Am7', 'Dm7', 'G7', 'Cmaj7 C7', 'Fmaj7', 'Bm7b5', 'E7b9', 'Am7 A7'),
    S('C', 'Dm7', 'G7', 'Em7b5', 'A7b9', 'Dm7', 'G7', 'C6', 'Bm7b5 E7'),
  ]),
  c('Jazz', 'Summertime', 'George Gershwin', 'ballad', 'Am', '4/4', 80, [
    S('A', 'Am6', 'Bm7b5 E7', 'Am6', '%', 'Dm7', '%', 'Bm7b5', 'E7'),
    S('B', 'Am6', 'Bm7b5 E7', 'Am6', 'A7', 'C Am7', 'Bm7b5 E7', 'Am6', 'Bm7b5 E7'),
  ]),
  c('Jazz', 'Take the "A" Train', 'Billy Strayhorn', 'swing', 'C', '4/4', 170, [
    S('A', 'C6', '%', 'D7b5', '%', 'Dm7', 'G7', 'C6', 'Dm7 G7'),
    S('A', 'C6', '%', 'D7b5', '%', 'Dm7', 'G7', 'C6', 'C7'),
    S('B', 'Fmaj7', '%', '%', '%', 'D7', '%', 'Dm7', 'G7'),
    S('A', 'C6', '%', 'D7b5', '%', 'Dm7', 'G7', 'C6', 'Dm7 G7'),
  ]),
  c('Jazz', 'Satin Doll', 'Duke Ellington & Billy Strayhorn', 'swing', 'C', '4/4', 120, [
    S('A', 'Dm7 G7', 'Dm7 G7', 'Em7 A7', 'Em7 A7', 'Am7 D7', 'Abm7 Db7', 'Cmaj7', 'Dm7 G7'),
    S('A', 'Dm7 G7', 'Dm7 G7', 'Em7 A7', 'Em7 A7', 'Am7 D7', 'Abm7 Db7', 'Cmaj7', '%'),
    S('B', 'Gm7', 'C7', 'Fmaj7', '%', 'Am7', 'D7', 'Dm7', 'G7'),
    S('A', 'Dm7 G7', 'Dm7 G7', 'Em7 A7', 'Em7 A7', 'Am7 D7', 'Abm7 Db7', 'Cmaj7', 'Dm7 G7'),
  ]),
  c('Jazz', 'There Will Never Be Another You', 'Harry Warren', 'swing', 'Eb', '4/4', 160, [
    S('A', 'Ebmaj7', '%', 'Dm7b5', 'G7b9', 'Cm7', '%', 'Bbm7', 'Eb7', 'Abmaj7', 'Db7', 'Ebmaj7', 'Cm7', 'F7', '%', 'Fm7', 'Bb7'),
    S('B', 'Ebmaj7', '%', 'Dm7b5', 'G7b9', 'Cm7', '%', 'Bbm7', 'Eb7', 'Abmaj7', 'Db7', 'Ebmaj7 D7', 'G7 C7', 'Fm7', 'Bb7', 'Eb6', 'Fm7 Bb7'),
  ]),
  c('Jazz', 'Misty', 'Erroll Garner', 'ballad', 'Eb', '4/4', 66, [
    S('A', 'Ebmaj7', 'Bbm7 Eb7', 'Abmaj7', 'Abm7 Db7', 'Ebmaj7 Cm7', 'Fm7 Bb7', 'Gm7 C7', 'Fm7 Bb7'),
    S('A', 'Ebmaj7', 'Bbm7 Eb7', 'Abmaj7', 'Abm7 Db7', 'Ebmaj7 Cm7', 'Fm7 Bb7', 'Eb6', 'Bbm7 Eb7'),
    S('B', 'Bbm7', 'Eb7b9', 'Abmaj7', '%', 'Am7 D7', 'Gm7 C7', 'Cm7 F7', 'Fm7 Bb7'),
    S('A', 'Ebmaj7', 'Bbm7 Eb7', 'Abmaj7', 'Abm7 Db7', 'Ebmaj7 Cm7', 'Fm7 Bb7', 'Eb6', 'Fm7 Bb7'),
  ]),
  c('Jazz', 'So What', 'Miles Davis', 'swing', 'Dm', '4/4', 136, [
    S('A', 'Dm7', '%', '%', '%', '%', '%', '%', '%'),
    S('A', 'Dm7', '%', '%', '%', '%', '%', '%', '%'),
    S('B', 'Ebm7', '%', '%', '%', '%', '%', '%', '%'),
    S('A', 'Dm7', '%', '%', '%', '%', '%', '%', '%'),
  ]),
  c('Jazz', 'Cantaloupe Island', 'Herbie Hancock', 'funk', 'Fm', '4/4', 112, [
    S('A', 'Fm7', '%', '%', '%', 'Db7', '%', '%', '%', 'Dm7', '%', '%', '%', 'Fm7', '%', '%', '%'),
  ]),
  c('Jazz', 'Watermelon Man', 'Herbie Hancock', 'funk', 'F', '4/4', 120, [
    S('A', 'F7', '%', '%', '%', 'Bb7', '%', 'F7', '%', 'C7', 'Bb7', 'C7', 'Bb7', 'C7', 'Bb7', 'F7', '%'),
  ]),
  c('Jazz', 'Minor Swing', 'Django Reinhardt & Stéphane Grappelli', 'swing', 'Am', '4/4', 200, [
    S('A', 'Am6', '%', 'Dm6', '%', 'E7', '%', 'Am6', '%', 'Dm6', '%', 'Am6', '%', 'E7', '%', 'Am6', '%'),
  ]),
  c('Jazz', 'Footprints', 'Wayne Shorter', 'waltz', 'Cm', '6/4', 150, [
    S('A', 'Cm7', '%', '%', '%', 'Fm7', '%', 'Cm7', '%', 'F#m7b5 B7#9', 'E7#9 A7#9', 'Cm7', '%'),
  ]),
  c('Jazz', 'I Got Rhythm', 'George Gershwin', 'swing', 'Bb', '4/4', 200, [
    S('A', 'Bb6 G7', 'Cm7 F7', 'Bb6 G7', 'Cm7 F7', 'Bb Bb7', 'Eb Ebm6', 'Dm7 G7', 'Cm7 F7'),
    S('A', 'Bb6 G7', 'Cm7 F7', 'Bb6 G7', 'Cm7 F7', 'Bb Bb7', 'Eb Ebm6', 'Bb/F F7', 'Bb6'),
    S('B', 'D7', '%', 'G7', '%', 'C7', '%', 'F7', '%'),
    S('A', 'Bb6 G7', 'Cm7 F7', 'Bb6 G7', 'Cm7 F7', 'Bb Bb7', 'Eb Ebm6', 'Bb/F F7', 'Bb6'),
  ]),
  c('Jazz', 'Body and Soul', 'Johnny Green', 'ballad', 'Db', '4/4', 60, [
    S('A', 'Ebm7 Bb7b9', 'Ebm7 D7', 'Dbmaj7 Gb7', 'Fm7 Edim7', 'Ebm7 / Cm7b5 F7', 'Bbm7 Eb7', 'Ebm7 Ab7', 'Db6 Bb7'),
    S('A', 'Ebm7 Bb7b9', 'Ebm7 D7', 'Dbmaj7 Gb7', 'Fm7 Edim7', 'Ebm7 / Cm7b5 F7', 'Bbm7 Eb7', 'Ebm7 Ab7', 'Db6 A7'),
    S('B', 'Dmaj7', 'Em7 / Gm7 C7', 'F#m7 Bm7', 'Em7 A7', 'Dmaj7', 'Dm7 G7', 'Cmaj7 Ebdim7 Dm7 G7', 'C7 B7 Bb7 /'),
    S('A', 'Ebm7 Bb7b9', 'Ebm7 D7', 'Dbmaj7 Gb7', 'Fm7 Edim7', 'Ebm7 / Cm7b5 F7', 'Bbm7 Eb7', 'Ebm7 Ab7', 'Db6 Bb7'),
  ]),
  c('Jazz', 'Georgia on My Mind', 'Hoagy Carmichael', 'ballad', 'F', '4/4', 66, [
    S('A', 'Fmaj7', 'A7', 'Dm7 Dm7/C', 'Bbm6', 'Am7 D7', 'Gm7 C7', 'Fmaj7 D7', 'Gm7 C7'),
    S('A', 'Fmaj7', 'A7', 'Dm7 Dm7/C', 'Bbm6', 'Am7 D7', 'Gm7 C7', 'F6 Bb7', 'F6'),
    S('B', 'Dm', 'Bb7', 'Dm', 'Bb7', 'Dm', 'Bb7', 'Am7 D7', 'Gm7 C7'),
    S('A', 'Fmaj7', 'A7', 'Dm7 Dm7/C', 'Bbm6', 'Am7 D7', 'Gm7 C7', 'F6 Bb7', 'F6'),
  ]),
  c('Jazz', 'On the Sunny Side of the Street', 'Jimmy McHugh', 'swing', 'C', '4/4', 130, [
    S('A', 'C6', 'E7', 'F6', 'G#dim7', 'C/G A7', 'Dm7 G7', 'C6 A7', 'Dm7 G7'),
    S('A', 'C6', 'E7', 'F6', 'G#dim7', 'C/G A7', 'Dm7 G7', 'C6', '%'),
    S('B', 'Gm7 C7', 'Gm7 C7', 'Fmaj7', '%', 'Am7 D7', 'Am7 D7', 'Dm7', 'G7'),
    S('A', 'C6', 'E7', 'F6', 'G#dim7', 'C/G A7', 'Dm7 G7', 'C6', 'Dm7 G7'),
  ]),
  c('Jazz', 'Honeysuckle Rose', 'Fats Waller', 'swing', 'F', '4/4', 160, [
    S('A', 'Gm7 C7', 'Gm7 C7', 'Gm7 C7', 'Gm7 C7', 'F6', 'Dm7', 'Gm7 C7', 'Am7b5 D7b9'),
    S('A', 'Gm7 C7', 'Gm7 C7', 'Gm7 C7', 'Gm7 C7', 'F6', 'Dm7', 'Gm7 C7', 'F6'),
    S('B', 'F7', '%', 'Bb6', '%', 'G7', '%', 'Gm7', 'C7'),
    S('A', 'Gm7 C7', 'Gm7 C7', 'Gm7 C7', 'Gm7 C7', 'F6', 'Dm7', 'Gm7 C7', 'F6'),
  ]),
  c('Jazz', "Ain't Misbehavin'", 'Fats Waller', 'swing', 'Eb', '4/4', 120, [
    S('A', 'Eb6 Edim7', 'Fm7 Bb7', 'Eb6 Eb7', 'Ab6 Abm6', 'Eb/G C7', 'Fm7 Bb7', 'Eb6 C7', 'Fm7 Bb7'),
    S('A', 'Eb6 Edim7', 'Fm7 Bb7', 'Eb6 Eb7', 'Ab6 Abm6', 'Eb/G C7', 'Fm7 Bb7', 'Eb6 Ab7', 'Eb6'),
    S('B', 'Cm', 'Cm/B', 'Cm/Bb', 'Am7b5 D7', 'Gm', 'Gm/F#', 'F7', 'Bb7'),
    S('A', 'Eb6 Edim7', 'Fm7 Bb7', 'Eb6 Eb7', 'Ab6 Abm6', 'Eb/G C7', 'Fm7 Bb7', 'Eb6 Ab7', 'Eb6'),
  ]),
  c('Jazz', 'Sweet Georgia Brown', 'Ben Bernie, Maceo Pinkard & Kenneth Casey', 'swing', 'F', '4/4', 220, [
    S('A', 'D7', '%', 'G7', '%', 'C7', '%', 'F', '%', 'D7', '%', 'G7', '%', 'Dm A7', 'Dm A7', 'Dm', 'C7'),
    S('B', 'D7', '%', 'G7', '%', 'C7', '%', 'F', '%', 'Gm7', 'D7', 'Gm7', 'D7', 'F', 'D7', 'G7 C7', 'F6'),
  ]),
  c('Jazz', 'Bye Bye Blackbird', 'Ray Henderson', 'swing', 'F', '4/4', 140, [
    S('A', 'F6', '%', 'Gm7 C7', 'F6', '%', 'Abdim7', 'Gm7', 'C7'),
    S('A2', 'Gm7', 'Gm(maj7)', 'Gm7', 'C7', 'Gm7', 'C7', 'F6', '%'),
    S('B', 'F7', '%', 'Am7b5', 'D7', 'Gm7', '%', 'Gm7b5', 'C7'),
    S('A3', 'F6', '%', 'Eb7', 'D7', 'Gm7', 'C7', 'F6 Dm7', 'Gm7 C7'),
  ]),
  c('Latin', 'Blue Bossa', 'Kenny Dorham', 'bossa', 'Cm', '4/4', 140, [
    S('A', 'Cm7', '%', 'Fm7', '%', 'Dm7b5', 'G7b9', 'Cm7', '%', 'Ebm7', 'Ab7', 'Dbmaj7', '%', 'Dm7b5', 'G7b9', 'Cm7', 'Dm7b5 G7b9'),
  ]),
  c('Latin', 'The Girl from Ipanema', 'Antônio Carlos Jobim', 'bossa', 'F', '4/4', 130, [
    S('A', 'Fmaj7', '%', 'G7', '%', 'Gm7', 'Gb7', 'Fmaj7', 'Gb7'),
    S('A', 'Fmaj7', '%', 'G7', '%', 'Gm7', 'Gb7', 'Fmaj7', '%'),
    S('B', 'Gbmaj7', '%', 'B7', '%', 'F#m7', '%', 'D7', '%', 'Gm7', '%', 'Eb7', '%', 'Am7', 'D7b9', 'Gm7', 'C7b9'),
    S('A', 'Fmaj7', '%', 'G7', '%', 'Gm7', 'Gb7', 'Fmaj7', 'Gb7'),
  ]),
  c('Latin', 'Black Orpheus (Manhã de Carnaval)', 'Luiz Bonfá', 'bossa', 'Am', '4/4', 130, [
    S('A', 'Am', 'Bm7b5 E7b9', 'Am', 'Bm7b5 E7b9', 'Am', 'Dm7 G7', 'Cmaj7', 'A7b9', 'Dm7', 'G7', 'Cmaj7', 'Fmaj7', 'Bm7b5', 'E7b9', 'Am', 'Bm7b5 E7b9'),
    S('B', 'Am', 'Bm7b5 E7b9', 'Am', 'Bm7b5 E7b9', 'Em7b5', 'A7b9', 'Dm7', '%', 'Dm7', 'Bm7b5 E7b9', 'Am', 'F7', 'Bm7b5', 'E7b9', 'Am', 'Bm7b5 E7b9'),
  ]),
  c('Latin', 'Song for My Father', 'Horace Silver', 'bossa', 'Fm', '4/4', 120, [
    S('A', 'Fm7', '%', 'Eb7', '%', 'Db7', 'C7', 'Fm7', '%'),
    S('A', 'Fm7', '%', 'Eb7', '%', 'Db7', 'C7', 'Fm7', '%'),
    S('B', 'Eb7', '%', 'Fm7', '%', 'Eb7', 'Db7 C7', 'Fm7', '%'),
  ]),
  c('Latin', 'Black Magic Woman', 'Peter Green', 'rock', 'Dm', '4/4', 120, [
    S('A', 'Dm7', 'Am7', 'Dm7', '%', 'Gm7', '%', 'Dm7', '%', 'A7', '%', 'Dm7', '%'),
  ]),

  // ---- Blues ----
  c('Blues', "Billie's Bounce", 'Charlie Parker', 'swing', 'F', '4/4', 170, [
    S('A', 'F7', 'Bb7', 'F7', 'Cm7 F7', 'Bb7', 'Bdim7', 'F7', 'Am7 D7', 'Gm7', 'C7', 'F7 D7', 'Gm7 C7'),
  ]),
  c('Blues', 'Mr. P.C.', 'John Coltrane', 'swing', 'Cm', '4/4', 220, [
    S('A', 'Cm7', '%', '%', '%', 'Fm7', '%', 'Cm7', '%', 'Ab7', 'G7', 'Cm7', 'G7'),
  ]),
  c('Blues', 'The Thrill Is Gone', 'Roy Hawkins & Rick Darnell', 'ballad', 'Bm', '4/4', 90, [
    S('A', 'Bm7', '%', '%', '%', 'Em7', '%', 'Bm7', '%', 'Gmaj7', 'F#7', 'Bm7', '%'),
  ]),
  c('Blues', 'Stormy Monday', 'T-Bone Walker', 'ballad', 'G', '4/4', 60, [
    S('A', 'G7 C9', 'G7', 'G7', 'G7', 'C9', '%', 'G7 Am7', 'Bm7 Bbm7', 'Am7', 'D7#9', 'G7 C9', 'G7 D7#9'),
  ]),
  c('Blues', 'Sweet Home Chicago', 'Robert Johnson', 'shuffle', 'E', '4/4', 120, [
    S('A', 'E7', 'A7', 'E7', '%', 'A7', '%', 'E7', '%', 'B7', 'A7', 'E7 A7', 'E7 B7'),
  ]),
  c('Blues', 'Pride and Joy', 'Stevie Ray Vaughan', 'shuffle', 'E', '4/4', 125, [
    S('A', 'E7', '%', '%', '%', 'A7', '%', 'E7', '%', 'B7', 'A7', 'E7', 'B7'),
  ]),
  c('Blues', 'Johnny B. Goode', 'Chuck Berry', 'rock', 'Bb', '4/4', 168, [
    S('A', 'Bb7', '%', '%', '%', 'Eb7', '%', 'Bb7', '%', 'F7', '%', 'Bb7', '%'),
  ]),

  // ---- Pop & Rock ----
  c('Pop & Rock', "Knockin' on Heaven's Door", 'Bob Dylan', 'rock', 'G', '4/4', 68, [
    S('A', 'G', 'D', 'Am7', '%', 'G', 'D', 'C', '%'),
  ]),
  c('Pop & Rock', 'Wonderwall (capo 2 shapes)', 'Noel Gallagher', 'pop', 'Em', '4/4', 87, [
    S('Verse', 'Em7', 'G', 'Dsus4', 'A7sus4', 'Em7', 'G', 'Dsus4', 'A7sus4'),
    S('Pre', 'C', 'D', 'Em7', '%', 'C', 'D', 'A7sus4', '%'),
    S('Chorus', 'C Em7', 'G Em7', 'C Em7', 'G Em7'),
  ]),
  c('Pop & Rock', 'Let It Be', 'Lennon–McCartney', 'pop', 'C', '4/4', 72, [
    S('Verse', 'C G', 'Am F', 'C G', 'F C', 'C G', 'Am F', 'C G', 'F C'),
    S('Chorus', 'Am G', 'F C', 'C G', 'F C'),
  ]),
  c('Pop & Rock', 'Stand by Me', 'Ben E. King', 'pop', 'A', '4/4', 118, [
    S('A', 'A', '%', 'F#m', '%', 'D', 'E', 'A', '%'),
  ]),
  c('Pop & Rock', 'Wish You Were Here', 'Pink Floyd', 'pop', 'G', '4/4', 120, [
    S('Intro', 'Em7', 'G', 'Em7', 'G', 'Em7', 'A7sus4', 'Em7', 'A7sus4 G'),
    S('Verse', 'C', 'D/F#', 'Am', 'G', 'D/F#', 'C', 'Am', 'G'),
  ]),
  c('Pop & Rock', 'Brown Eyed Girl', 'Van Morrison', 'pop', 'G', '4/4', 148, [
    S('Verse', 'G', 'C', 'G', 'D', 'G', 'C', 'G', 'D'),
    S('Pre', 'C', 'D', 'G', 'Em', 'C', 'D', 'G', 'D7'),
    S('Chorus', 'G', 'C', 'G', 'D7', 'G', 'C', 'G D7', 'G'),
  ]),
  c('Pop & Rock', 'A Horse with No Name', 'Dewey Bunnell', 'pop', 'Em', '4/4', 122, [
    S('A', 'Em', 'D6/9', 'Em', 'D6/9', 'Em', 'D6/9', 'Em', 'D6/9'),
  ]),
  c('Pop & Rock', 'Sweet Home Alabama', 'Lynyrd Skynyrd', 'rock', 'D', '4/4', 98, [
    S('A', 'D C', 'G', 'D C', 'G', 'D C', 'G', 'D C', 'G'),
  ]),
  c('Pop & Rock', 'Hey Joe', 'Billy Roberts', 'rock', 'E', '4/4', 80, [
    S('A', 'C G', 'D A', 'E', '%', 'C G', 'D A', 'E', '%'),
  ]),
  c('Pop & Rock', "Free Fallin' (capo 1 shapes)", 'Tom Petty & Jeff Lynne', 'pop', 'D', '4/4', 84, [
    S('A', 'D Dsus4', 'D A', 'D Dsus4', 'D A', 'D Dsus4', 'D A', 'D Dsus4', 'D A'),
  ]),
  c('Pop & Rock', 'Hallelujah', 'Leonard Cohen', 'ballad', 'C', '3/4', 60, [
    S('Verse', 'C', 'Am', 'C', 'Am', 'F', 'G', 'C', 'G', 'C', 'F G', 'Am F', 'G', 'E7', 'Am', '%', '%'),
    S('Chorus', 'F', '%', 'Am', '%', 'F', '%', 'C', 'G', 'C', '%'),
  ]),
  c('Pop & Rock', 'Hotel California', 'Don Felder, Don Henley & Glenn Frey', 'rock', 'Bm', '4/4', 74, [
    S('Verse', 'Bm', 'F#', 'A', 'E', 'G', 'D', 'Em', 'F#'),
    S('Chorus', 'G', 'D', 'F#', 'Bm', 'G', 'D', 'Em', 'F#'),
  ]),

  // ---- Folk & Country ----
  c('Folk & Country', 'Take Me Home, Country Roads', 'Bill Danoff, Taffy Nivert & John Denver', 'country', 'G', '4/4', 82, [
    S('Verse', 'G', 'Em', 'D', 'C', 'G', 'Em', 'D', 'C G'),
    S('Chorus', 'G', 'D', 'Em', 'C', 'G', 'D', 'C', 'G'),
  ]),
  c('Folk & Country', "Blowin' in the Wind", 'Bob Dylan', 'country', 'D', '4/4', 90, [
    S('Verse', 'D G', 'D', 'D G', 'A', 'D G', 'D', 'G A', 'D'),
    S('Chorus', 'G A', 'D Bm', 'G A', 'D'),
  ]),
  c('Folk & Country', 'Leaving on a Jet Plane', 'John Denver', 'country', 'G', '4/4', 96, [
    S('Verse', 'G', 'C', 'G', 'C', 'G', 'C', 'D', '%'),
    S('Chorus', 'G', 'C', 'G', 'Em', 'D', '%', 'G', 'D'),
  ]),
  c('Folk & Country', 'Wagon Wheel', 'Bob Dylan & Ketch Secor', 'country', 'A', '4/4', 145, [
    S('A', 'A', 'E', 'F#m', 'D', 'A', 'E', 'D', '%'),
  ]),
]

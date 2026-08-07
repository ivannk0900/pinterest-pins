# Pinterest bulk pin upload sheets

This project produces the CSV that goes into Pinterest's **Bulk create Pins** screen, and the
alt-text sidecar that goes with it. That is the whole job.

It does not host a website, does not run a build, and does not touch any other repo.

Everything below was learned the expensive way on an accepted batch of 41 pins — the
`content-strategy-template` batch, which is the reference for every format decision here.
Three of the four traps each cost a failed upload. They are fixed constraints, not
suggestions.

---

## What a batch is

A batch of pins for one destination (a blog post, a product listing, a freebie) is three things:

| Path | What it is |
|---|---|
| `<batch>/<title-slug>.png` | the pin images, 800×1200, one file per pin, named after the pin's own title so a row and an image match by eye |
| `<batch>/pinterest-bulk-set-<n>.csv` | what actually goes into Pinterest, in its exact column spec, ≤200 rows per file |
| `<batch>/pins.csv` | the fuller working sheet — same copy plus the alt text, which Pinterest's bulk format has no column for |

Keep both CSVs. The bulk sheet is what was uploaded; `pins.csv` is the record and the source of
the alt text that still has to be typed into each pin by hand afterwards.

---

## The bulk CSV, in full

Column names must match this spelling exactly. Pinterest rejects the file outright if it sees a
column it does not recognise, so **no extra columns** — that is what `pins.csv` is for.

| Column | Required | Notes |
|---|---|---|
| `Title` | yes | 100 characters max |
| `Media URL` | yes | public link ending `.png` or `.jpg` |
| `Pinterest board` | yes | must match an existing board name exactly, character for character |
| `Description` | no | 500 characters max |
| `Link` | no | destination URL — must be unique per row, see trap 3 |
| `Publish date` | no | `2026-08-05` or `2026-08-05T09:00:00`, UTC |
| `Keywords` | no | comma-separated |
| `Thumbnail` | video only | omit entirely for image pins |

Header row in that order. Every data field quoted. UTF-8, no BOM, LF line endings. 200 rows per
upload; split into numbered sheets past that. This is exactly what the accepted 41-pin batch
looked like — `scripts/build_batch.py` reproduces it byte for byte.

### `pins.csv` columns

`set,file,title,description,alt_text,link,keywords,pexels_id,publish_date`

Authored by hand (or dropped in from the compositor): `file`, `title`, `description`,
`alt_text`, `link`, `keywords`, `pexels_id`. Filled in by `build_batch.py`: `set`, `link`'s UTM
query string, `publish_date`. Start from `templates/pins.csv`.

---

## The four traps

**1. Column names.** Pinterest's own help page calls it *Media file URL*; the importer actually
wants `Media URL`. `board` fails — it wants the literal string `Pinterest board`. Any
unrecognised column (`file`, `alt_text`, `pexels_id`) rejects the whole file.

**2. `Media URL` must be a public link Pinterest can fetch.** It does not upload a file off the
machine. Something has to host the images. **This repo is the host** — commit the batch folder
to `main` and the PNGs are served over
`https://raw.githubusercontent.com/ivannk0900/pinterest-pins/main/<batch>/<file>.png`. Push
before running the validator; the raw URLs 404 until the commit is on `main`. The link only has
to be alive **at publish time** — Pinterest copies the image onto its own CDN when the pin is
created, so the folder is disposable once the last pin in the batch has gone up.

**3. Duplicate `Link` — the one that cost 9 pins.** The importer permits one pin per destination
link per file. A sheet where 7 rows point at the same post creates the first and silently rejects
the other 6; you find out by email, after the fact, and the rejected titles are listed but the
accepted one is not. Fix: give every row a unique query string, with `utm_content` set to the
pin's own slug —

```
https://example.com/blog/<post>?utm_source=pinterest&utm_medium=pin&utm_campaign=<batch>&utm_content=<title-slug>
```

That makes each row unique and makes a click attributable to the pin that earned it. Check the
destination returns 200 with a query string attached before uploading.

**4. A `Publish date` in the past publishes on import**, not on the day. A sheet that sits unused
for a week fires its whole backlog at once. Always re-check the dates against today before
upload, and say so if any have gone stale.

---

## Scheduling

Default to one pin per day, starting tomorrow, at a random time inside a 09:00–21:00 UTC window —
a different minute per pin, not a round hour on every row. **Ask before deviating from
one-a-day.**

---

## Copy rules

- The pin title is also the headline printed on the image. They must match.
- If Gabi hands you titles and descriptions she wrote herself, **use them verbatim**. Don't
  rewrite them.
- Every headline should name the audience the pin is for. A pin that could be for any small
  business gets saved by any small business and converts none of them.
- Descriptions are for a human first and search second: say what the thing is, who it's for, and
  end with a reason to click.
- Alt text is a plain description of what is visibly on the pin — the photograph and the words —
  written for someone who cannot see it. It goes in `pins.csv` only.

---

## Starting a batch

Ask for these, and don't guess:

1. the destination URL(s) and which pins point where
2. the exact Pinterest board name
3. the start date

Hosting is no longer a question — the images go in this repo (trap 2).

Then produce the images-to-rows mapping, both CSVs, and a short pre-upload checklist. **Verify
the checklist rather than asserting it** — `scripts/validate_batch.py` is what does the verifying.

```bash
# 1. scaffold
mkdir "<batch>" && cp templates/pins.csv "<batch>/pins.csv"
#    author the rows, drop the PNGs in alongside

# 2. build the bulk sheets (fills set / UTM link / publish_date back into pins.csv)
python3 scripts/build_batch.py "<batch>" \
  --board "Social media manager business" \
  --media-base https://raw.githubusercontent.com/ivannk0900/pinterest-pins/main/<batch>

# 3. push, or every Media URL 404s
git add "<batch>" && git commit -m "Add <batch>" && git push origin main

# 4. verify before uploading — checks columns, row counts, link uniqueness,
#    lengths, stale dates, and that every URL actually resolves
python3 scripts/validate_batch.py "<batch>"
```

Both scripts are stdlib-only Python 3.9+. `build_batch.py` is idempotent and takes `--dry-run`;
`validate_batch.py` takes `--offline` to skip the network checks and exits non-zero on any
failure. Re-run the validator immediately before uploading — that is the pass that catches trap 4.

---

## Out of scope

**Making the pin images.** That compositor lives in the site repo because it depends on its fonts
and design tokens — Gabi runs it there and drops the PNGs into this project. Don't rebuild it
here unless asked.

**Pinterest's own API is not the route.** A new app only gets Trial access, where created pins
are sandbox-only and visible to nobody. Real pins need Standard access, which means an app review
including a video of the app doing the thing. Zapier's Pinterest integration sidesteps that if
automation is ever wanted.

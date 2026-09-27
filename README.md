# bulk pinterest pins

Produces the CSV that goes into Pinterest's **Bulk create Pins** screen, and the alt-text
sidecar that goes with it. Nothing else — no site, no build, no image generation.

The rules, the column spec, and the four traps that have each cost a failed upload are in
[CLAUDE.md](CLAUDE.md). Read that first.

## A batch, start to finish

```bash
mkdir "my-batch" && cp templates/pins.csv "my-batch/pins.csv"
# author the rows in pins.csv, drop the 800x1200 PNGs in alongside,
# each named after its own pin title

python3 scripts/build_batch.py "my-batch" \
  --board "Social media manager business" \
  --media-base https://raw.githubusercontent.com/ivannk0900/pinterest-pins/main/my-batch

# the images are hosted from this repo, so push before validating or every URL 404s
git add "my-batch" && git commit -m "Add my-batch" && git push origin main

python3 scripts/validate_batch.py "my-batch"
```

`build_batch.py` fills in the three derived fields — the `set` each row uploads in, the UTM
query string that keeps every `Link` unique, and a publish date one per day starting tomorrow at
a random time in a 09:00–21:00 UTC window — writes them back into `pins.csv`, and emits
`pinterest-bulk-set-<n>.csv` in Pinterest's exact column spec. It refuses to write a sheet the
importer would reject. Re-running changes nothing. `--per-day N` cuts the window into N equal
slots and puts one pin in each, so a day's pins never land minutes apart.

`validate_batch.py` is the pre-upload checklist, verified rather than asserted: column names,
row counts, link uniqueness, title and description lengths, publish dates that have gone stale,
and whether every media URL and destination link actually returns 200. It exits non-zero if
anything fails. **Run it again immediately before uploading** — a sheet that sits unused for a
week fires its whole backlog on import.

Both are stdlib-only Python 3.9+. `--dry-run` on the builder, `--offline` on the validator.

## Verified against

`scripts/build_batch.py` reproduces the accepted 41-pin `content-strategy-template` sheets
byte for byte from their `pins.csv`. That batch is the reference for every format decision
here.

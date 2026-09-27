#!/usr/bin/env python3
"""Build Pinterest bulk-upload sheets from a batch's pins.csv.

Reads <batch>/pins.csv, fills in the three derived fields (set, UTM link, publish date),
writes it back, and emits <batch>/pinterest-bulk-set-<n>.csv in Pinterest's exact column
spec -- byte-for-byte the format the 41-pin batch was accepted in.

Idempotent: values already present in pins.csv are kept, so a second run changes nothing.

    python3 scripts/build_batch.py "<batch>" \
      --board "Social media manager business" \
      --media-base https://raw.githubusercontent.com/<user>/<repo>/main/<batch>
"""

import argparse
import csv
import os
import random
import re
import sys
from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

# Pinterest's importer rejects the whole file over a column it does not recognise.
# These names and this order are the ones that worked. Do not "fix" the spelling.
BULK_COLUMNS = [
    "Title",
    "Media URL",
    "Pinterest board",
    "Description",
    "Link",
    "Publish date",
    "Keywords",
]
PINS_COLUMNS = [
    "set",
    "file",
    "title",
    "description",
    "alt_text",
    "link",
    "keywords",
    "pexels_id",
    "publish_date",
]
REQUIRED_PINS_COLUMNS = ["file", "title"]

MAX_ROWS_PER_SHEET = 200
MAX_TITLE = 100
MAX_DESCRIPTION = 500
DEFAULT_WINDOW = "09:00-21:00"


class BuildError(Exception):
    pass


def slugify(text):
    text = re.sub(r"[^a-z0-9]+", "-", text.lower())
    return text.strip("-")


def parse_window(spec):
    match = re.match(r"^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$", spec.strip())
    if not match:
        raise BuildError("--window must look like 09:00-21:00, got %r" % spec)
    start_h, start_m, end_h, end_m = (int(g) for g in match.groups())
    start = start_h * 60 + start_m
    end = end_h * 60 + end_m
    if not 0 <= start < end <= 24 * 60:
        raise BuildError("--window start must be before end and inside a day: %r" % spec)
    return start, end


def read_pins(path):
    if not os.path.exists(path):
        raise BuildError(
            "no pins.csv at %s -- start one with: cp templates/pins.csv %r" % (path, path)
        )
    with open(path, newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames is None:
            raise BuildError("%s is empty" % path)
        header = [name.strip() for name in reader.fieldnames]
        missing = [c for c in REQUIRED_PINS_COLUMNS if c not in header]
        if missing:
            raise BuildError(
                "%s is missing required column(s): %s" % (path, ", ".join(missing))
            )
        rows = []
        for index, raw in enumerate(reader, start=2):
            row = {}
            for key, value in raw.items():
                if key is None:
                    continue
                row[key.strip()] = (value or "").strip()
            if not any(row.values()):
                continue
            row["_line"] = index
            rows.append(row)
    if not rows:
        raise BuildError("%s has a header but no rows" % path)
    return rows, header


def media_url(base, filename):
    return "%s/%s" % (base.rstrip("/"), filename.lstrip("/"))


def with_utm(link, campaign, content):
    """Append the UTM query string that makes every row's Link unique (trap 3).

    Existing query parameters are preserved; a link that already carries utm_content is
    left alone, so re-running never rewrites a link that has already been uploaded.
    """
    if not link:
        return ""
    parts = urlsplit(link)
    params = parse_qsl(parts.query, keep_blank_values=True)
    existing = {key for key, _ in params}
    if "utm_content" in existing:
        return link
    for key, value in (
        ("utm_source", "pinterest"),
        ("utm_medium", "pin"),
        ("utm_campaign", campaign),
        ("utm_content", content),
    ):
        if key not in existing and value:
            params.append((key, value))
    query = urlencode(params, safe="/:")
    return urlunsplit((parts.scheme, parts.netloc, parts.path, query, parts.fragment))


def schedule(rows, start_date, window, per_day, seed):
    """Assign a publish_date to every row that lacks one.

    One pin per day by default, at a random time inside the window -- a different minute
    per pin, never a round hour on every row. With several a day, the window is cut into
    that many equal slots with one pin in each, at least half a slot after the pin before
    it, so a day's pins never bunch together. Seeded off the batch so re-runs are stable.
    """
    window_start, window_end = window
    slot = (window_end - window_start) // per_day
    rng = random.Random(seed)
    used = set()
    unscheduled = [row for row in rows if not row.get("publish_date")]
    previous = None
    for offset, row in enumerate(unscheduled):
        day = start_date + timedelta(days=offset // per_day)
        slot_start = window_start + (offset % per_day) * slot
        slot_end = window_end if per_day == 1 else slot_start + slot
        if offset % per_day == 0:
            previous = None
        for _ in range(500):
            minute_of_day = rng.randrange(slot_start, slot_end)
            stamp = (day, minute_of_day)
            if stamp not in used and (
                previous is None or minute_of_day - previous >= slot // 2
            ):
                break
        used.add(stamp)
        previous = minute_of_day
        when = datetime(
            day.year, day.month, day.day, minute_of_day // 60, minute_of_day % 60
        )
        row["publish_date"] = when.strftime("%Y-%m-%dT%H:%M:00")
    return len(unscheduled)


def assign_sets(rows, max_rows):
    """Group rows into upload sheets, honouring a `set` column if one is already filled."""
    if all(row.get("set") for row in rows):
        order = []
        for row in rows:
            if row["set"] not in order:
                order.append(row["set"])
        return [[row for row in rows if row["set"] == key] for key in order]

    ordered = sorted(rows, key=lambda row: row.get("publish_date") or "")
    sheets = [ordered[i : i + max_rows] for i in range(0, len(ordered), max_rows)]
    for number, sheet in enumerate(sheets, start=1):
        for row in sheet:
            row["set"] = str(number)
    return sheets


def check_copy(rows, batch_dir, check_images):
    problems = []
    seen_files = {}
    for row in rows:
        line = row["_line"]
        title = row.get("title", "")
        description = row.get("description", "")
        if not title:
            problems.append("line %d: no title" % line)
        if len(title) > MAX_TITLE:
            problems.append(
                "line %d: title is %d chars (max %d) -- %s..."
                % (line, len(title), MAX_TITLE, title[:60])
            )
        if len(description) > MAX_DESCRIPTION:
            problems.append(
                "line %d: description is %d chars (max %d)"
                % (line, len(description), MAX_DESCRIPTION)
            )
        if not row.get("alt_text"):
            problems.append("line %d: no alt_text (pins.csv exists to carry it)" % line)
        filename = row.get("file", "")
        if not filename:
            problems.append("line %d: no file" % line)
        else:
            if filename in seen_files:
                problems.append(
                    "line %d: file %r already used on line %d"
                    % (line, filename, seen_files[filename])
                )
            seen_files[filename] = line
            if check_images and not os.path.exists(os.path.join(batch_dir, filename)):
                problems.append("line %d: image not found in batch: %s" % (line, filename))
    return problems


def write_bulk_sheet(path, rows, board):
    """Header unquoted, every data field quoted, LF endings, no BOM -- as accepted."""
    with open(path, "w", newline="", encoding="utf-8") as handle:
        handle.write(",".join(BULK_COLUMNS) + "\n")
        writer = csv.writer(handle, quoting=csv.QUOTE_ALL, lineterminator="\n")
        for row in rows:
            writer.writerow(
                [
                    row.get("title", ""),
                    row["media_url"],
                    board,
                    row.get("description", ""),
                    row.get("link", ""),
                    row.get("publish_date", ""),
                    row.get("keywords", ""),
                ]
            )


def write_pins_sheet(path, rows, header):
    columns = list(PINS_COLUMNS)
    for name in header:
        if name not in columns:
            columns.append(name)
    with open(path, "w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle, lineterminator="\n")
        writer.writerow(columns)
        for row in rows:
            writer.writerow([row.get(column, "") for column in columns])


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("batch", help="batch directory containing pins.csv and the PNGs")
    parser.add_argument("--board", required=True, help="exact Pinterest board name")
    parser.add_argument(
        "--media-base",
        required=True,
        help="public base URL the images are served from, e.g. "
        "https://raw.githubusercontent.com/<user>/<repo>/main/<batch>",
    )
    parser.add_argument(
        "--campaign", help="utm_campaign value (default: the batch directory name)"
    )
    parser.add_argument(
        "--start", help="first publish date, YYYY-MM-DD UTC (default: tomorrow)"
    )
    parser.add_argument("--window", default=DEFAULT_WINDOW, help="UTC publish window")
    parser.add_argument(
        "--per-day",
        type=int,
        default=1,
        help="pins per day, spread across the window in equal slots (default 1)",
    )
    parser.add_argument("--max-rows", type=int, default=MAX_ROWS_PER_SHEET)
    parser.add_argument("--seed", help="scheduling seed (default: campaign + start date)")
    parser.add_argument(
        "--no-image-check", action="store_true", help="skip the local PNG existence check"
    )
    parser.add_argument("--dry-run", action="store_true", help="print, write nothing")
    args = parser.parse_args(argv)

    batch_dir = args.batch.rstrip("/")
    campaign = args.campaign or os.path.basename(os.path.abspath(batch_dir))
    pins_path = os.path.join(batch_dir, "pins.csv")

    rows, header = read_pins(pins_path)
    window = parse_window(args.window)
    if args.per_day < 1:
        raise BuildError("--per-day must be at least 1")

    if args.start:
        try:
            start_date = datetime.strptime(args.start, "%Y-%m-%d").date()
        except ValueError:
            raise BuildError("--start must be YYYY-MM-DD, got %r" % args.start)
    else:
        start_date = datetime.now(timezone.utc).date() + timedelta(days=1)

    problems = check_copy(rows, batch_dir, not args.no_image_check)
    if problems:
        raise BuildError(
            "pins.csv would produce a sheet Pinterest rejects:\n  "
            + "\n  ".join(problems)
        )

    for row in rows:
        slug = slugify(os.path.splitext(row["file"])[0])
        row["media_url"] = media_url(args.media_base, row["file"])
        row["link"] = with_utm(row.get("link", ""), campaign, slug)

    scheduled = schedule(
        rows, start_date, window, args.per_day, args.seed or (campaign + str(start_date))
    )
    sheets = assign_sets(rows, args.max_rows)

    for sheet_index, sheet in enumerate(sheets, start=1):
        links = {}
        for row in sheet:
            link = row.get("link", "")
            if not link:
                continue
            if link in links:
                raise BuildError(
                    "sheet %d: duplicate Link on lines %d and %d -- Pinterest would "
                    "silently reject the second row (trap 3):\n  %s"
                    % (sheet_index, links[link], row["_line"], link)
                )
            links[link] = row["_line"]

    print("batch:      %s" % batch_dir)
    print("campaign:   %s" % campaign)
    print("board:      %s" % args.board)
    print("rows:       %d in %d sheet(s)" % (len(rows), len(sheets)))
    print(
        "scheduled:  %d newly dated from %s (%s UTC, %d/day), %d already dated"
        % (scheduled, start_date, args.window, args.per_day, len(rows) - scheduled)
    )

    outputs = []
    for number, sheet in enumerate(sheets, start=1):
        path = os.path.join(batch_dir, "pinterest-bulk-set-%d.csv" % number)
        outputs.append((path, sheet))
        first = sheet[0].get("publish_date", "")
        last = sheet[-1].get("publish_date", "")
        print("  %s  %d rows  %s -> %s" % (os.path.basename(path), len(sheet), first, last))

    if args.dry_run:
        print("\n--dry-run: nothing written")
        return 0

    for path, sheet in outputs:
        write_bulk_sheet(path, sheet, args.board)
    write_pins_sheet(pins_path, rows, header)

    print("\nwrote %d sheet(s) and updated %s" % (len(outputs), pins_path))
    print("next:  python3 scripts/validate_batch.py %r" % batch_dir)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except BuildError as error:
        sys.stderr.write("error: %s\n" % error)
        sys.exit(1)

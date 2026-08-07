#!/usr/bin/env python3
"""Pre-upload checklist for a Pinterest bulk batch -- verified, not asserted.

Checks every bulk sheet in a batch for the things that have actually caused failed
uploads: unrecognised column names, duplicate destination links, over-length copy,
publish dates that have gone stale, and media URLs that do not resolve.

    python3 scripts/validate_batch.py "<batch>"            # includes network checks
    python3 scripts/validate_batch.py "<batch>" --offline   # skips them

Exits non-zero if anything fails. Re-run it immediately before uploading -- that is the
pass that catches a sheet whose dates have gone stale while it sat around.
"""

import argparse
import csv
import glob
import os
import sys
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

BULK_COLUMNS = [
    "Title",
    "Media URL",
    "Pinterest board",
    "Description",
    "Link",
    "Publish date",
    "Keywords",
]
KNOWN_COLUMNS = set(BULK_COLUMNS) | {"Thumbnail"}
REQUIRED_COLUMNS = ["Title", "Media URL", "Pinterest board"]

MAX_ROWS_PER_SHEET = 200
MAX_TITLE = 100
MAX_DESCRIPTION = 500
DATE_FORMATS = ["%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M", "%Y-%m-%d"]
USER_AGENT = "Mozilla/5.0 (compatible; pin-batch-validator/1.0)"
TIMEOUT = 20


class Report(object):
    def __init__(self):
        self.failures = 0
        self.warnings = 0

    def ok(self, message):
        print("  \033[32mPASS\033[0m  %s" % message)

    def fail(self, message, details=None):
        self.failures += 1
        print("  \033[31mFAIL\033[0m  %s" % message)
        for line in details or []:
            print("          %s" % line)

    def warn(self, message, details=None):
        self.warnings += 1
        print("  \033[33mWARN\033[0m  %s" % message)
        for line in details or []:
            print("          %s" % line)

    def skip(self, message):
        print("  \033[90mSKIP\033[0m  %s" % message)

    def check(self, condition, ok_message, fail_message, details=None):
        if condition:
            self.ok(ok_message)
        else:
            self.fail(fail_message, details)


def read_sheet(path):
    with open(path, newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        header = list(reader.fieldnames or [])
        rows = []
        for index, raw in enumerate(reader, start=2):
            if not any((value or "").strip() for value in raw.values()):
                continue
            row = {
                (key or ""): (value or "")
                for key, value in raw.items()
                if key is not None
            }
            row["_line"] = index
            rows.append(row)
    return header, rows


def parse_date(value):
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(value, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


def fetch_status(url):
    """HEAD the URL, falling back to a one-byte GET for hosts that refuse HEAD."""
    for method, headers in (
        ("HEAD", {}),
        ("GET", {"Range": "bytes=0-0"}),
    ):
        request = Request(url, method=method)
        request.add_header("User-Agent", USER_AGENT)
        for key, value in headers.items():
            request.add_header(key, value)
        try:
            with urlopen(request, timeout=TIMEOUT) as response:
                return response.status, response.headers.get("Content-Type", "")
        except HTTPError as error:
            if method == "HEAD" and error.code in (403, 405, 501):
                continue
            return error.code, ""
        except (URLError, OSError) as error:
            if method == "HEAD":
                continue
            return None, str(getattr(error, "reason", error))
    return None, "unreachable"


def check_urls(report, urls, label, expect_image):
    if not urls:
        return
    results = {}
    with ThreadPoolExecutor(max_workers=8) as pool:
        for url, result in zip(urls, pool.map(fetch_status, urls)):
            results[url] = result

    broken = []
    not_image = []
    for url in urls:
        status, info = results[url]
        if status != 200:
            broken.append("%s -> %s" % (url, status if status else info))
        elif expect_image and info and not info.split(";")[0].strip().startswith("image/"):
            not_image.append("%s -> %s" % (url, info))

    report.check(
        not broken,
        "all %d %s resolve (200)" % (len(urls), label),
        "%d of %d %s do not resolve" % (len(broken), len(urls), label),
        broken[:10],
    )
    if not_image:
        report.warn(
            "%d %s returned a non-image content type" % (len(not_image), label),
            not_image[:10],
        )


def validate_sheet(path, batch_dir, report, offline, expected_board):
    print("\n%s" % os.path.basename(path))
    header, rows = read_sheet(path)

    unknown = [name for name in header if name not in KNOWN_COLUMNS]
    missing = [name for name in REQUIRED_COLUMNS if name not in header]
    report.check(
        not unknown and not missing,
        "columns are exactly what the importer accepts",
        "column names would reject the whole file",
        (["unrecognised: %s" % ", ".join(unknown)] if unknown else [])
        + (["missing: %s" % ", ".join(missing)] if missing else []),
    )
    if "Thumbnail" in header:
        report.warn("Thumbnail is present -- omit it entirely for image pins")

    report.check(
        0 < len(rows) <= MAX_ROWS_PER_SHEET,
        "%d rows (limit %d)" % (len(rows), MAX_ROWS_PER_SHEET),
        "%d rows -- split into numbered sheets of %d"
        % (len(rows), MAX_ROWS_PER_SHEET),
    )
    if not rows:
        return set()

    links = {}
    if "Link" not in header:
        report.warn("no Link column -- every pin in this sheet would be unclickable")
    else:
        duplicates = []
        blank_links = []
        for row in rows:
            link = row.get("Link", "").strip()
            if not link:
                blank_links.append(row["_line"])
                continue
            if link in links:
                duplicates.append(
                    "lines %d and %d share: %s" % (links[link], row["_line"], link)
                )
            else:
                links[link] = row["_line"]
        report.check(
            not duplicates,
            "every Link in this sheet is unique",
            "%d duplicate Link(s) -- Pinterest creates the first and silently rejects the rest"
            % len(duplicates),
            duplicates[:10],
        )
        if blank_links:
            report.warn("%d row(s) have no Link" % len(blank_links))

    long_titles = [
        "line %d: %d chars" % (row["_line"], len(row.get("Title", "")))
        for row in rows
        if len(row.get("Title", "")) > MAX_TITLE
    ]
    blank_titles = [row["_line"] for row in rows if not row.get("Title", "").strip()]
    report.check(
        not long_titles and not blank_titles,
        "every Title is present and <= %d chars" % MAX_TITLE,
        "%d Title problem(s)" % (len(long_titles) + len(blank_titles)),
        long_titles[:10] + (["blank on lines: %s" % blank_titles[:10]] if blank_titles else []),
    )

    long_descriptions = [
        "line %d: %d chars" % (row["_line"], len(row.get("Description", "")))
        for row in rows
        if len(row.get("Description", "")) > MAX_DESCRIPTION
    ]
    report.check(
        not long_descriptions,
        "every Description is <= %d chars" % MAX_DESCRIPTION,
        "%d Description(s) over %d chars" % (len(long_descriptions), MAX_DESCRIPTION),
        long_descriptions[:10],
    )

    now = datetime.now(timezone.utc)
    stale = []
    unparsed = []
    for row in rows:
        value = row.get("Publish date", "").strip()
        if not value:
            continue
        when = parse_date(value)
        if when is None:
            unparsed.append("line %d: %r" % (row["_line"], value))
        elif when <= now:
            stale.append("line %d: %s (publishes on import)" % (row["_line"], value))
    report.check(
        not stale and not unparsed,
        "no Publish date is in the past (checked against %s UTC)"
        % now.strftime("%Y-%m-%d %H:%M"),
        "%d stale or unparseable Publish date(s)" % (len(stale) + len(unparsed)),
        (stale + unparsed)[:10],
    )

    boards = sorted({row.get("Pinterest board", "").strip() for row in rows})
    if "Pinterest board" not in header:
        report.skip("board name -- the column is missing (see the column check above)")
    elif expected_board:
        report.check(
            boards == [expected_board],
            "Pinterest board matches %r on every row" % expected_board,
            "Pinterest board does not match %r" % expected_board,
            ["found: %s" % ", ".join(repr(b) for b in boards)],
        )
    elif len(boards) > 1:
        report.warn(
            "rows target %d different boards" % len(boards),
            ["%r" % board for board in boards],
        )
    else:
        report.ok("Pinterest board is %r on every row" % boards[0])

    media = []
    if "Media URL" not in header:
        report.skip("media URLs -- the column is missing (see the column check above)")
    else:
        blank_media = []
        bad_extension = []
        for row in rows:
            url = row.get("Media URL", "").strip()
            if not url:
                blank_media.append("line %d: empty (Media URL is required)" % row["_line"])
            elif not url.lower().split("?")[0].endswith((".png", ".jpg", ".jpeg")):
                bad_extension.append("line %d: %s" % (row["_line"], url))
            else:
                media.append(url)
        report.check(
            not bad_extension and not blank_media,
            "every Media URL is present and ends .png or .jpg",
            "%d Media URL problem(s)" % (len(bad_extension) + len(blank_media)),
            (blank_media + bad_extension)[:10],
        )

        local_missing = [
            "line %d: %s" % (row["_line"], os.path.basename(row["Media URL"].split("?")[0]))
            for row in rows
            if row.get("Media URL", "").strip()
            and not os.path.exists(
                os.path.join(batch_dir, os.path.basename(row["Media URL"].split("?")[0]))
            )
        ]
        if local_missing:
            report.warn(
                "%d Media URL(s) have no matching image in the batch folder"
                % len(local_missing),
                local_missing[:10],
            )
        elif media:
            report.ok("every Media URL has a matching image file in the batch folder")

    if not offline:
        check_urls(report, sorted(set(media)), "Media URLs", True)
        check_urls(report, sorted(links), "destination Links", False)

    return set(links)


def validate_pins_sheet(path, report, bulk_titles):
    print("\npins.csv")
    if not os.path.exists(path):
        report.fail("no pins.csv -- the alt text has no record")
        return
    with open(path, newline="", encoding="utf-8-sig") as handle:
        rows = [row for row in csv.DictReader(handle) if any((v or "").strip() for v in row.values())]

    report.check(
        len(rows) == len(bulk_titles),
        "%d rows, matching the bulk sheets" % len(rows),
        "%d rows but %d across the bulk sheets" % (len(rows), len(bulk_titles)),
    )

    missing_alt = [
        row.get("title", "")[:60] for row in rows if not (row.get("alt_text") or "").strip()
    ]
    report.check(
        not missing_alt,
        "every row has alt text",
        "%d row(s) have no alt text" % len(missing_alt),
        missing_alt[:10],
    )

    titles = {(row.get("title") or "").strip() for row in rows}
    orphans = sorted(bulk_titles - titles)
    report.check(
        not orphans,
        "every uploaded title appears in pins.csv",
        "%d uploaded title(s) missing from pins.csv" % len(orphans),
        orphans[:10],
    )


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("batch", help="batch directory")
    parser.add_argument("--board", help="assert this exact Pinterest board name")
    parser.add_argument(
        "--offline", action="store_true", help="skip the URL resolution checks"
    )
    args = parser.parse_args(argv)

    batch_dir = args.batch.rstrip("/")
    if not os.path.isdir(batch_dir):
        sys.stderr.write("error: no such batch directory: %s\n" % batch_dir)
        return 1

    sheets = sorted(glob.glob(os.path.join(batch_dir, "pinterest-bulk-*.csv")))
    if not sheets:
        sys.stderr.write(
            "error: no pinterest-bulk-*.csv in %s -- run build_batch.py first\n" % batch_dir
        )
        return 1

    report = Report()
    print("Pre-upload checklist: %s" % batch_dir)
    if args.offline:
        print("(--offline: URL resolution not checked)")

    all_links = set()
    all_titles = set()
    for path in sheets:
        sheet_links = validate_sheet(path, batch_dir, report, args.offline, args.board)
        overlap = all_links & sheet_links
        if overlap:
            report.warn(
                "%d Link(s) also appear in an earlier sheet" % len(overlap),
                sorted(overlap)[:5],
            )
        all_links |= sheet_links
        _, rows = read_sheet(path)
        all_titles |= {row.get("Title", "").strip() for row in rows}

    validate_pins_sheet(os.path.join(batch_dir, "pins.csv"), report, all_titles)

    print("\n%s" % ("-" * 60))
    if report.failures:
        print("%d check(s) FAILED, %d warning(s) -- do not upload" % (report.failures, report.warnings))
        return 1
    print("all checks passed, %d warning(s) -- %d pins ready to upload" % (report.warnings, len(all_titles)))
    return 0


if __name__ == "__main__":
    sys.exit(main())

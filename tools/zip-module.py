#!/usr/bin/env python3
"""Create a Foundry module zip with <module-id>/ at the archive root."""
import sys
import zipfile
from pathlib import Path

# Fixed entry timestamp: the package must depend on content, not on when a
# file happened to be copied, so a sync never dirties an unrelated module.
FIXED_TIME = (1980, 1, 1, 0, 0, 0)

if len(sys.argv) < 3:
    raise SystemExit("usage: zip-module.py <module-dir> <output.zip>")

source = Path(sys.argv[1]).resolve()
destination = Path(sys.argv[2]).resolve()
root = source.name

if not (source / "module.json").is_file():
    raise SystemExit(f"not a module: {source}")

destination.parent.mkdir(parents=True, exist_ok=True)
try:
    with zipfile.ZipFile(destination, "w", zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(source.rglob("*")):
            if not path.is_file():
                continue
            if path.name == "LOCK" or path.suffix.lower() in {".zip", ".tmp"}:
                continue
            info = zipfile.ZipInfo(
                (Path(root) / path.relative_to(source)).as_posix(),
                date_time=FIXED_TIME,
            )
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = (0o644 & 0xFFFF) << 16
            archive.writestr(info, path.read_bytes())
except OSError as error:
    destination.unlink(missing_ok=True)
    raise SystemExit(f"could not write {destination}: {error}")

with zipfile.ZipFile(destination) as archive:
    names = archive.namelist()
    if not names:
        destination.unlink()
        raise SystemExit(f"empty archive written: {destination}")
    stray = [name for name in names if not name.startswith(f"{root}/")]
    if stray:
        destination.unlink()
        raise SystemExit(f"entry outside {root}/: {stray[0]}")
    if f"{root}/module.json" not in names:
        destination.unlink()
        raise SystemExit(f"module.json missing from archive root of {destination}")

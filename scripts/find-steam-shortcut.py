#!/usr/bin/env python3
"""Find Steam shortcut IDs for an executable in binary shortcuts.vdf files."""

from __future__ import annotations

import glob
import os
import re
import shutil
import struct
import sys
from pathlib import Path
from typing import Any


def read_cstring(data: bytes, offset: int) -> tuple[str, int]:
    end = data.index(b"\0", offset)
    return data[offset:end].decode("utf-8"), end + 1


class VdfObject(dict[str, Any]):
    """A binary VDF object's values, with each text value's byte range in the file."""

    def __init__(self) -> None:
        super().__init__()
        self.text_ranges: dict[str, tuple[int, int]] = {}


def read_object(data: bytes, offset: int = 0) -> tuple[VdfObject, int]:
    result = VdfObject()

    while offset < len(data):
        value_type = data[offset]
        offset += 1
        if value_type == 8:
            return result, offset

        key, offset = read_cstring(data, offset)
        if value_type == 0:
            value, offset = read_object(data, offset)
        elif value_type == 1:
            start = offset
            value, offset = read_cstring(data, offset)
            result.text_ranges[key] = (start, offset - 1)
        elif value_type == 2:
            value = struct.unpack_from("<I", data, offset)[0]
            offset += 4
        elif value_type == 3:
            value = struct.unpack_from("<f", data, offset)[0]
            offset += 4
        elif value_type == 7:
            value = struct.unpack_from("<Q", data, offset)[0]
            offset += 8
        else:
            raise ValueError(f"unsupported binary VDF value type: {value_type}")

        result[key] = value

    raise ValueError("unterminated binary VDF object")


def normalize_executable(value: str) -> str:
    return value.strip().strip('"')


def matching_shortcuts(target: str, data: bytes) -> list[VdfObject]:
    """Return the shortcuts in one shortcuts.vdf whose Exe names target and that have an appid."""
    root, _ = read_object(data)
    shortcuts = root.get("shortcuts", {})
    return [
        shortcut
        for shortcut in shortcuts.values()
        if isinstance(shortcut, VdfObject)
        and normalize_executable(str(shortcut.get("Exe", ""))) == target
        and isinstance(shortcut.get("appid"), int)
    ]


def find_shortcuts(target: str, files: list[str]) -> list[tuple[int, Path]]:
    matches: list[tuple[int, Path]] = []
    for filename in files:
        shortcut_file = Path(filename)
        for shortcut in matching_shortcuts(target, shortcut_file.read_bytes()):
            matches.append((shortcut["appid"], shortcut_file.parent / "grid"))
    return matches


def set_shortcut_icon(target: str, app_id: int, icon: str, files: list[str]) -> None:
    """Set the icon of each shortcut the lookup finds with this appid, checking them all before writing any."""
    updates: list[tuple[Path, bytes]] = []
    for filename in files:
        shortcut_file = Path(filename)
        data = shortcut_file.read_bytes()
        icon_ranges = []
        for shortcut in matching_shortcuts(target, data):
            if shortcut["appid"] != app_id:
                continue
            if not isinstance(shortcut.get("icon"), str):
                raise ValueError(f"icon field not found in shortcut {app_id} for {target}")
            icon_ranges.append(shortcut.text_ranges["icon"])

        updated = data
        # Replace from the end of the file so earlier ranges stay valid.
        for start, end in sorted(icon_ranges, reverse=True):
            updated = updated[:start] + icon.encode() + updated[end:]
        if updated != data:
            updates.append((shortcut_file, updated))

    for shortcut_file, updated in updates:
        backup = shortcut_file.with_suffix(shortcut_file.suffix + ".steam-game.bak")
        if not backup.exists():
            shutil.copy2(shortcut_file, backup)

        temporary = shortcut_file.with_suffix(shortcut_file.suffix + ".steam-game.tmp")
        temporary.write_bytes(updated)
        os.chmod(temporary, shortcut_file.stat().st_mode)
        os.replace(temporary, shortcut_file)
        print(f"Updated shortcut icon in {shortcut_file}", file=sys.stderr)


def main() -> int:
    arguments = sys.argv[1:]
    icon_edit: tuple[int, str] | None = None
    if arguments[:1] == ["--set-icon"]:
        if len(arguments) < 4 or not re.fullmatch(r"[0-9]+", arguments[1]):
            print(
                "usage: find-steam-shortcut.py --set-icon APPID ICON EXECUTABLE [SHORTCUTS_VDF ...]",
                file=sys.stderr,
            )
            return 2
        icon_edit = (int(arguments[1]), arguments[2])
        arguments = arguments[3:]

    if not arguments:
        print(
            "usage: find-steam-shortcut.py [--set-icon APPID ICON] EXECUTABLE [SHORTCUTS_VDF ...]",
            file=sys.stderr,
        )
        return 2

    target = arguments[0]
    files = arguments[1:] or glob.glob(
        str(Path.home() / ".local/share/Steam/userdata/*/config/shortcuts.vdf")
    )
    if icon_edit is not None:
        set_shortcut_icon(target, *icon_edit, files)
    for app_id, grid_dir in find_shortcuts(target, files):
        print(f"{app_id}\t{grid_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

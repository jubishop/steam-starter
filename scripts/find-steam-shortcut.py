#!/usr/bin/env python3
"""Find Steam shortcut IDs for an executable in binary shortcuts.vdf files."""

from __future__ import annotations

import glob
import os
import shutil
import struct
import sys
from pathlib import Path
from typing import Any


def read_cstring(data: bytes, offset: int) -> tuple[str, int]:
    end = data.index(b"\0", offset)
    return data[offset:end].decode("utf-8"), end + 1


def read_object(data: bytes, offset: int = 0) -> tuple[dict[str, Any], int]:
    result: dict[str, Any] = {}

    while offset < len(data):
        value_type = data[offset]
        offset += 1
        if value_type == 8:
            return result, offset

        key, offset = read_cstring(data, offset)
        if value_type == 0:
            value, offset = read_object(data, offset)
        elif value_type == 1:
            value, offset = read_cstring(data, offset)
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


def find_shortcuts(target: str, files: list[str]) -> list[tuple[int, Path]]:
    matches: list[tuple[int, Path]] = []
    for filename in files:
        shortcut_file = Path(filename)
        root, _ = read_object(shortcut_file.read_bytes())
        shortcuts = root.get("shortcuts", {})
        for shortcut in shortcuts.values():
            if not isinstance(shortcut, dict):
                continue
            if normalize_executable(str(shortcut.get("Exe", ""))) != target:
                continue
            app_id = shortcut.get("appid")
            if isinstance(app_id, int):
                matches.append((app_id, shortcut_file.parent / "grid"))
    return matches


def set_shortcut_icon(target: str, icon: str, files: list[str]) -> None:
    exe_values = (target, f'"{target}"')
    for filename in files:
        shortcut_file = Path(filename)
        data = shortcut_file.read_bytes()
        updated = data

        for exe_value in exe_values:
            exe_field = b"\x01Exe\0" + exe_value.encode() + b"\0"
            exe_offset = updated.find(exe_field)
            if exe_offset < 0:
                continue

            icon_field = b"\x01icon\0"
            icon_key_offset = updated.find(
                icon_field,
                exe_offset + len(exe_field),
            )
            shortcut_path_offset = updated.find(
                b"\x01ShortcutPath\0",
                exe_offset + len(exe_field),
            )
            if (
                icon_key_offset < 0
                or shortcut_path_offset < 0
                or icon_key_offset > shortcut_path_offset
            ):
                raise ValueError(f"icon field not found for {target}")

            value_start = icon_key_offset + len(icon_field)
            value_end = updated.index(b"\0", value_start)
            updated = updated[:value_start] + icon.encode() + updated[value_end:]
            break

        if updated == data:
            continue

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
    icon: str | None = None
    if arguments[:1] == ["--set-icon"]:
        if len(arguments) < 3:
            print(
                "usage: find-steam-shortcut.py --set-icon ICON EXECUTABLE [SHORTCUTS_VDF ...]",
                file=sys.stderr,
            )
            return 2
        icon = arguments[1]
        arguments = arguments[2:]

    if not arguments:
        print(
            "usage: find-steam-shortcut.py [--set-icon ICON] EXECUTABLE [SHORTCUTS_VDF ...]",
            file=sys.stderr,
        )
        return 2

    target = arguments[0]
    files = arguments[1:] or glob.glob(
        str(Path.home() / ".local/share/Steam/userdata/*/config/shortcuts.vdf")
    )
    if icon is not None:
        set_shortcut_icon(target, icon, files)
    for app_id, grid_dir in find_shortcuts(target, files):
        print(f"{app_id}\t{grid_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

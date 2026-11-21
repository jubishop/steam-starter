"""Verify find-steam-shortcut.py against synthetic binary shortcuts.vdf files, run as deployment runs it."""

import os
from pathlib import Path
import struct
import subprocess
import sys
import tempfile
import unittest

SOURCE = Path(__file__).resolve().parents[1]
TOOL = (SOURCE / "scripts/find-steam-shortcut.py").read_text()
GAME = "/home/deck/Games/demo/demo"


def text(key, value):
    return b"\x01" + key.encode() + b"\0" + value.encode() + b"\0"


def number(key, value):
    return b"\x02" + key.encode() + b"\0" + struct.pack("<I", value)


def group(key, body):
    return b"\x00" + key.encode() + b"\0" + body + b"\x08"


def shortcut(index, app_id, exe, icon="", *, has_icon=True):
    """Build one shortcut from a subset of the fields Steam writes, in Steam's order."""
    return group(str(index), b"".join((
        number("appid", app_id),
        text("AppName", f"Game {index}"),
        text("Exe", exe),
        text("StartDir", '"/home/deck/Games/demo/"'),
        text("icon", icon) if has_icon else b"",
        text("ShortcutPath", ""),
        text("LaunchOptions", "--fullscreen"),
        number("IsHidden", 0),
        number("LastPlayTime", 1700000000),
        group("tags", text("0", "favorite")),
    )))


def library(*shortcuts):
    return b"\x00shortcuts\0" + b"".join(shortcuts) + b"\x08\x08"


class FindSteamShortcutTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="steam-starter shortcuts ")
        self.addCleanup(temporary.cleanup)
        home = Path(temporary.name).resolve() / "home"
        self.userdata = home / ".local/share/Steam/userdata"
        self.env = {key: value for key, value in os.environ.items() if not key.startswith("PYTHON")}
        self.env["HOME"] = str(home)

    def vdf(self, user, data):
        path = self.userdata / user / "config/shortcuts.vdf"
        path.parent.mkdir(parents=True)
        path.write_bytes(data)
        path.chmod(0o600)
        return path

    def tool(self, *arguments):
        # Deployment pipes the script to `python3 -` on the Steam Machine.
        return subprocess.run([sys.executable, "-", *arguments], input=TOOL, env=self.env,
                              text=True, capture_output=True, timeout=60)

    def set_icon(self, icon, path, target=GAME):
        return self.tool("--set-icon", icon, target, str(path))

    def entries(self, path):
        return sorted(entry.name for entry in path.parent.iterdir())

    def test_lookup_prints_each_exact_executable_match_quoted_or_not(self):
        first = self.vdf("111", library(
            shortcut(0, 3000000001, f'"{GAME}"'),
            shortcut(1, 3000000002, f"{GAME}-other"),
            shortcut(2, 3000000003, "/home/deck/Games/demo"),
        ))
        second = self.vdf("222", library(shortcut(0, 4000000004, GAME)))
        originals = {first: first.read_bytes(), second: second.read_bytes()}

        result = self.tool(GAME, str(first), str(second))

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout, f"3000000001\t{first.parent / 'grid'}\n"
                                        f"4000000004\t{second.parent / 'grid'}\n")
        self.assertEqual({path: path.read_bytes() for path in originals}, originals)

    def test_lookup_without_files_searches_every_steam_user(self):
        # Deployment's lookup passes no files, so the script finds each user's shortcuts.vdf under HOME.
        first = self.vdf("111", library(shortcut(0, 3000000001, GAME)))
        second = self.vdf("222", library(shortcut(0, 4000000004, f'"{GAME}"')))

        result = self.tool(GAME)

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(sorted(result.stdout.splitlines()), [f"3000000001\t{first.parent / 'grid'}",
                                                              f"4000000004\t{second.parent / 'grid'}"])

    def test_set_icon_changes_only_the_matching_icon(self):
        icon = "/new/grid/3000000002_icon.jpg"
        for user, exe in (("111", GAME), ("222", f'"{GAME}"')):
            with self.subTest(exe=exe):
                before = shortcut(0, 3000000001, f"{GAME}-other", "/old/other.png")
                after = shortcut(2, 3000000003, "/home/deck/Games/demo", "/old/after.png")
                path = self.vdf(user, library(before, shortcut(1, 3000000002, exe, "/old.png"), after))

                result = self.set_icon(icon, path)

                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual(path.read_bytes(), library(before, shortcut(1, 3000000002, exe, icon), after))
                self.assertEqual(path.stat().st_mode & 0o777, 0o600)
                self.assertEqual(result.stdout, f"3000000002\t{path.parent / 'grid'}\n")
                self.assertEqual(self.entries(path), ["shortcuts.vdf", "shortcuts.vdf.steam-game.bak"])

    def test_missing_icon_before_shortcut_path_fails_and_leaves_the_file(self):
        path = self.vdf("111", library(
            shortcut(0, 3000000001, GAME, has_icon=False),
            shortcut(1, 3000000002, "/home/deck/Games/other/other", "/old/other.png"),
        ))
        original = path.read_bytes()

        result = self.set_icon("/new/icon.jpg", path)

        self.assertNotEqual(result.returncode, 0)
        self.assertIn(f"icon field not found for {GAME}", result.stderr)
        self.assertEqual(path.read_bytes(), original)
        self.assertEqual(self.entries(path), ["shortcuts.vdf"])

    def test_first_edit_backs_up_the_original_and_later_edits_keep_it(self):
        original = library(shortcut(0, 3000000001, GAME, "/old.png"))
        path = self.vdf("111", original)
        backup = path.with_name("shortcuts.vdf.steam-game.bak")

        for icon in ("/first/icon.jpg", "/second/icon.jpg"):
            with self.subTest(icon=icon):
                result = self.set_icon(icon, path)

                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual(path.read_bytes(), library(shortcut(0, 3000000001, GAME, icon)))
                self.assertEqual(backup.read_bytes(), original)

    def test_no_write_without_a_needed_change(self):
        cases = {
            "nothing matches": (f"{GAME}-other", "/new/icon.jpg", ""),
            "icon already set": (GAME, "/same/icon.jpg", "3000000001\t{grid}\n"),
        }
        for name, (exe, icon, stdout) in cases.items():
            with self.subTest(name):
                path = self.vdf(name, library(shortcut(0, 3000000001, exe, "/same/icon.jpg")))
                original, modified = path.read_bytes(), path.stat().st_mtime_ns

                result = self.set_icon(icon, path)

                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual(result.stdout, stdout.format(grid=path.parent / "grid"))
                self.assertEqual((path.read_bytes(), path.stat().st_mtime_ns), (original, modified))
                self.assertEqual(self.entries(path), ["shortcuts.vdf"])


if __name__ == "__main__":
    unittest.main()

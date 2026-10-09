"""Verify the application checks that bin/check --full runs, with simulated tools."""

import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

SOURCE = Path(__file__).resolve().parents[1]


class CheckApplicationTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="steam-starter application checks ")
        self.addCleanup(temporary.cleanup)
        base = Path(temporary.name).resolve()
        self.repo = base / "checkout"
        (self.repo / "bin").mkdir(parents=True)
        shutil.copy2(SOURCE / "bin/check-application", self.repo / "bin/check-application")
        (self.repo / "tests").mkdir()
        (self.repo / "tests/test_probe.py").write_text(
            "import json, os, unittest\n"
            "class Probe(unittest.TestCase):\n"
            "    def test_probe(self):\n"
            "        with open(os.environ['CHECK_EVENTS'], 'a') as stream:\n"
            "            stream.write(json.dumps(['tooling tests']) + '\\n')\n"
            "        self.assertNotIn('FAIL_TOOLING', os.environ)\n")
        self.events = base / "events.jsonl"
        self.tools = base / "tools"
        self.tools.mkdir()
        (self.tools / "python3").symlink_to(sys.executable)
        self.tool("node", "import os\nprint(os.environ.get('CHECK_NODE_VERSION', 'v24.11.0'))\n")
        self.tool("npm", "import json, os, sys\n"
                         "keys = ('GIT_DIR', 'PYTHONPATH', 'PYTHONHOME', 'PYTHONDONTWRITEBYTECODE')\n"
                         "environment = {key: os.environ.get(key) for key in keys}\n"
                         "with open(os.environ['CHECK_EVENTS'], 'a') as stream:\n"
                         "    stream.write(json.dumps(['npm', *sys.argv[1:], os.getcwd(), environment]) + '\\n')\n"
                         "if 'FAIL_NPM' in os.environ:\n"
                         "    print('npm check failed', file=sys.stderr)\n"
                         "    sys.exit(19)\n")
        self.cwd = base
        self.env = {key: value for key, value in os.environ.items()
                    if key not in {"FAIL_TOOLING", "FAIL_NPM"} and not key.startswith(("GIT_", "PYTHON"))}
        self.env.update(PATH=str(self.tools), CHECK_EVENTS=str(self.events))

    def tool(self, name, body):
        path = self.tools / name
        path.write_text("#!" + sys.executable + "\n" + body)
        path.chmod(0o755)

    def check(self, **extra):
        return subprocess.run([str(self.repo / "bin/check-application")], cwd=self.cwd, env=self.env | extra,
                              text=True, capture_output=True, timeout=60)

    def recorded(self):
        return [json.loads(line) for line in self.events.read_text().splitlines()] if self.events.exists() else []

    def test_runs_tooling_tests_then_npm_check_from_checkout_without_inherited_selectors(self):
        result = self.check(GIT_DIR=str(self.cwd), PYTHONPATH=str(self.cwd), PYTHONHOME=sys.base_prefix)
        self.assertEqual(result.returncode, 0, result.stderr)
        environment = {"GIT_DIR": None, "PYTHONPATH": None, "PYTHONHOME": None, "PYTHONDONTWRITEBYTECODE": "1"}
        self.assertEqual(self.recorded(), [["tooling tests"], ["npm", "run", "check", str(self.repo), environment]])

    def test_unsupported_or_missing_node_stops_before_any_check(self):
        for version in ("v18.0.0", "v22.18.0", "v26.1.0"):
            with self.subTest(version=version):
                result = self.check(CHECK_NODE_VERSION=version)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn(f"Node {version} is unsupported", result.stderr)
                self.assertEqual(self.recorded(), [])
        (self.tools / "node").unlink()
        result = self.check()
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self.recorded(), [])

    def test_failures_propagate_and_stop_later_checks(self):
        result = self.check(FAIL_TOOLING="1")
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self.recorded(), [["tooling tests"]])
        self.events.unlink()
        result = self.check(FAIL_NPM="1")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("npm check failed", result.stderr)
        self.assertEqual([event[:3] for event in self.recorded()], [["tooling tests"], ["npm", "run", "check"]])


if __name__ == "__main__":
    unittest.main()

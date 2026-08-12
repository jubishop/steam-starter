import { readFile } from "node:fs/promises";

const config = JSON.parse(
  await readFile(new URL("../game.config.json", import.meta.url), "utf8"),
);

const failures = [];
if (typeof config.title !== "string" || !config.title.trim() || /[\r\n]/u.test(config.title)) {
  failures.push("title must be a nonempty single line");
}
if (typeof config.slug !== "string" || !/^[a-z0-9][a-z0-9-]*$/u.test(config.slug)) {
  failures.push("slug must contain lowercase letters, digits, and hyphens");
}
if (typeof config.appId !== "string" || !/^[A-Za-z][A-Za-z0-9.-]+$/u.test(config.appId)) {
  failures.push("appId must be a reverse-domain application ID");
}
if (
  typeof config.description !== "string" ||
  !config.description.trim() ||
  /[\r\n]/u.test(config.description)
) {
  failures.push("description must be a nonempty single line");
}

if (failures.length > 0) {
  console.error(`Invalid game.config.json:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log("Game configuration is valid.");

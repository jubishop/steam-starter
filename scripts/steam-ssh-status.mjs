import { probeSteamMachine, steamMachineTarget } from "./lib/steam-machine.mjs";

process.on("uncaughtException", reportFailure);
process.on("unhandledRejection", reportFailure);

function reportFailure(error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Steam Machine status check failed: ${message}`);
  process.exit(1);
}

const { status, message } = await probeSteamMachine(steamMachineTarget());
const remedy = status === "untrusted" ? " Run npm run setup:steam once." : "";
console.log(`${status}: ${message}${remedy}`);
process.exitCode = status === "ready" ? 0 : 1;

import { resolve } from "node:path";
import { findLockfile, parseNpmLockfile } from "./lock.js";
import { formatTree, packagesWithHooks, toJson } from "./tree.js";

function usage(): never {
  console.error("hooktree — print install-lifecycle scripts from a lockfile");
  console.error("Usage: hooktree [dir] [--json] [--strict]");
  process.exit(2);
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes("-h") || args.includes("--help")) usage();
  const flags = new Set(args.filter((a) => a.startsWith("-")));
  const pos = args.filter((a) => !a.startsWith("-"));
  const dir = resolve(pos[0] ?? ".");
  const lockPath = findLockfile(dir);
  if (!lockPath) {
    console.error("No package-lock.json in " + dir);
    process.exit(2);
  }
  const result = parseNpmLockfile(dir, lockPath, { includePrepare: true });
  if (flags.has("--json")) console.log(JSON.stringify(toJson(result), null, 2));
  else console.log(formatTree(result));
  if (flags.has("--strict") && packagesWithHooks(result).length > 0) process.exit(1);
}

main();

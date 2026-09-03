import type { LockedPkg, LockParseResult } from "./lock.js";

export function packagesWithHooks(result: LockParseResult): LockedPkg[] {
  return result.packages.filter((p) => p.scripts.length > 0);
}

export function formatTree(result: LockParseResult): string {
  const pkgs = packagesWithHooks(result);
  const lines: string[] = [];
  lines.push(`hooktree — install-lifecycle scripts from ${result.lockfile}`);
  if (result.lockfileVersion != null) {
    lines.push(`lockfileVersion: ${result.lockfileVersion}`);
  }
  lines.push("");

  if (pkgs.length === 0) {
    lines.push("No install-lifecycle scripts found. Clean tree.");
    return lines.join("\n");
  }

  lines.push(`${pkgs.length} package(s) would run code at install time:`);
  lines.push("");

  for (const pkg of pkgs) {
    const where = pkg.nmPath || "(root)";
    lines.push(`├─ ${pkg.name}@${pkg.version}`);
    lines.push(`│  path: ${where}`);
    for (let i = 0; i < pkg.scripts.length; i++) {
      const s = pkg.scripts[i]!;
      const last = i === pkg.scripts.length - 1;
      const branch = last ? "└─" : "├─";
      lines.push(`│  ${branch} ${s.name}: ${s.command}`);
    }
    lines.push("│");
  }

  lines.push(`Total hooks: ${pkgs.reduce((n, p) => n + p.scripts.length, 0)}`);
  return lines.join("\n");
}

export function toJson(result: LockParseResult) {
  const pkgs = packagesWithHooks(result);
  return {
    lockfile: result.lockfile,
    lockfileVersion: result.lockfileVersion,
    count: pkgs.length,
    packages: pkgs.map((p) => ({
      name: p.name,
      version: p.version,
      path: p.nmPath || "(root)",
      scripts: p.scripts,
    })),
  };
}

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export const LIFECYCLE_SCRIPTS = [
  "preinstall",
  "install",
  "postinstall",
  "prepare",
] as const;

export type LifecycleName = (typeof LIFECYCLE_SCRIPTS)[number];

export type ScriptEntry = {
  name: LifecycleName;
  command: string;
};

export type LockedPkg = {
  name: string;
  version: string;
  nmPath: string;
  lockKey: string;
  hasInstallScript?: boolean;
  scripts: ScriptEntry[];
};

export type LockParseResult = {
  lockfile: string;
  lockfileVersion?: number;
  packages: LockedPkg[];
};

type NpmPackageMeta = {
  name?: string;
  version?: string;
  hasInstallScript?: boolean;
  scripts?: Record<string, string>;
};

type NpmLockfile = {
  name?: string;
  version?: string;
  lockfileVersion?: number;
  packages?: Record<string, NpmPackageMeta>;
};

function nameFromLockKey(key: string, metaName?: string): string {
  if (metaName) return metaName;
  if (!key || key === "") return "(root)";
  const parts = key.split("node_modules/").filter(Boolean);
  const last = parts[parts.length - 1] ?? key;
  return last.replace(/\/$/, "") || "(root)";
}

function readNestedPackageJson(
  projectDir: string,
  nmPath: string,
): { scripts?: Record<string, string>; name?: string; version?: string } | null {
  if (!nmPath) return null;
  const pkgPath = join(projectDir, nmPath, "package.json");
  if (!existsSync(pkgPath)) return null;
  try {
    return JSON.parse(readFileSync(pkgPath, "utf8")) as {
      scripts?: Record<string, string>;
      name?: string;
      version?: string;
    };
  } catch {
    return null;
  }
}

function pickLifecycleScripts(
  scripts: Record<string, string> | undefined,
  opts: { includePrepare: boolean },
): ScriptEntry[] {
  if (!scripts) return [];
  const out: ScriptEntry[] = [];
  for (const name of LIFECYCLE_SCRIPTS) {
    if (name === "prepare" && !opts.includePrepare) continue;
    const command = scripts[name];
    if (typeof command === "string" && command.length > 0) {
      out.push({ name, command });
    }
  }
  return out;
}

export function parseNpmLockfile(
  projectDir: string,
  lockPath: string,
  opts: { includePrepare?: boolean } = {},
): LockParseResult {
  const includePrepare = opts.includePrepare ?? true;
  const raw = readFileSync(lockPath, "utf8");
  const lock = JSON.parse(raw) as NpmLockfile;
  const packages: LockedPkg[] = [];

  for (const [lockKey, meta] of Object.entries(lock.packages ?? {})) {
    const nmPath = lockKey;
    const nested = readNestedPackageJson(projectDir, nmPath);
    const scriptsSource = meta.scripts ?? nested?.scripts;
    let scripts = pickLifecycleScripts(scriptsSource, { includePrepare });

    if (scripts.length === 0 && meta.hasInstallScript && nested?.scripts) {
      scripts = pickLifecycleScripts(nested.scripts, { includePrepare });
    }

    if (scripts.length === 0 && meta.hasInstallScript && !nested?.scripts) {
      scripts = [
        {
          name: "install",
          command: "(hasInstallScript; scripts unknown — not installed)",
        },
      ];
    }

    if (scripts.length === 0) continue;

    const name = nameFromLockKey(lockKey, meta.name ?? nested?.name);
    const version = meta.version ?? nested?.version ?? "?";
    packages.push({
      name,
      version,
      nmPath,
      lockKey,
      hasInstallScript: meta.hasInstallScript,
      scripts,
    });
  }

  return {
    lockfile: lockPath,
    lockfileVersion: lock.lockfileVersion,
    packages,
  };
}

export function findLockfile(projectDir: string): string | null {
  const npmLock = join(projectDir, "package-lock.json");
  if (existsSync(npmLock)) return npmLock;
  return null;
}

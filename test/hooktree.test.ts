import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseNpmLockfile, findLockfile } from "../src/lock.ts";
import { formatTree, packagesWithHooks, toJson } from "../src/tree.ts";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = resolve(here, "../fixtures/evil-tree");

describe("hooktree", () => {
  it("finds package-lock.json", () => {
    assert.equal(findLockfile(fixture), join(fixture, "package-lock.json"));
  });

  it("parses install hooks from lock + nested package.json", () => {
    const lock = findLockfile(fixture)!;
    const result = parseNpmLockfile(fixture, lock);
    const hooks = packagesWithHooks(result);
    const names = hooks.map((h) => h.name).sort();
    assert.deepEqual(names, ["evil-pkg", "nested-evil"]);
    const evil = hooks.find((h) => h.name === "evil-pkg")!;
    assert.equal(evil.scripts.length, 2);
    const nested = hooks.find((h) => h.name === "nested-evil")!;
    assert.equal(nested.scripts[0]?.name, "install");
  });

  it("formatTree mentions hooks", () => {
    const lock = findLockfile(fixture)!;
    const result = parseNpmLockfile(fixture, lock);
    const text = formatTree(result);
    assert.match(text, /evil-pkg@1\.0\.0/);
    assert.match(text, /postinstall/);
  });

  it("toJson count", () => {
    const lock = findLockfile(fixture)!;
    const result = parseNpmLockfile(fixture, lock);
    assert.equal(toJson(result).count, 2);
  });
});

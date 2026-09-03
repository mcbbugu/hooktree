# hooktree

English · [中文](README.zh.md)

Print the install-lifecycle script tree from a lockfile before you install.

Most auditors dump a flat list. hooktree shows only packages that would run preinstall / install / postinstall / prepare.

## Quick start

```
node --import tsx src/cli.ts .
node dist/cli.js .
```

## Commands

```
hooktree [dir]
hooktree [dir] --json
hooktree [dir] --strict
```

Node 20+. Reads package-lock.json v2/v3. No network.

## License

MIT

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { DepGraph, Package } from "../types/index.js";

interface CargoEntry {
  name: string;
  version: string;
  rawDeps: string[];
}

function parseEntries(content: string): CargoEntry[] {
  return content
    .split("[[package]]")
    .slice(1)
    .flatMap(block => {
      const name    = block.match(/\bname\s*=\s*"([^"]+)"/)?.[1];
      const version = block.match(/\bversion\s*=\s*"([^"]+)"/)?.[1];
      if (!name || !version) return [];

      const depsSection = block.match(/\bdependencies\s*=\s*\[([\s\S]*?)\]/);
      const rawDeps: string[] = [];
      if (depsSection?.[1]) {
        for (const m of depsSection[1].matchAll(/"([^"]+)"/g)) {
          if (m[1]) rawDeps.push(m[1]);
        }
      }
      return [{ name, version, rawDeps }];
    });
}

function resolveDepSpec(spec: string, pkgMap: Map<string, Package>): string | undefined {
  const parts = spec.trim().split(/\s+/);
  const name    = parts[0]!;
  const version = parts[1];

  if (version && !version.startsWith("(")) {
    const key = `${name}@${version}`;
    return pkgMap.has(key) ? key : undefined;
  }

  let found: string | undefined;
  let count = 0;
  for (const [key, pkg] of pkgMap) {
    if (pkg.name === name) { found = key; count++; }
  }
  return count === 1 ? found : undefined;
}

export function parseCargo(projectPath: string): DepGraph {
  const content = readFileSync(join(projectPath, "Cargo.lock"), "utf8");
  const entries = parseEntries(content);

  const pkgMap = new Map<string, Package>();
  for (const e of entries) {
    pkgMap.set(`${e.name}@${e.version}`, { name: e.name, version: e.version });
  }

  const deps    = new Map<string, string[]>();
  const depended = new Set<string>();

  for (const e of entries) {
    const key      = `${e.name}@${e.version}`;
    const depKeys: string[] = [];
    for (const spec of e.rawDeps) {
      const resolved = resolveDepSpec(spec, pkgMap);
      if (resolved) { depKeys.push(resolved); depended.add(resolved); }
    }
    deps.set(key, depKeys);
  }

  const roots = entries
    .map(e => `${e.name}@${e.version}`)
    .filter(key => !depended.has(key));

  const projectName = roots[0]
    ? pkgMap.get(roots[0])!.name
    : "(workspace)";

  return { ecosystem: "cargo", projectName, packages: pkgMap, deps, roots };
}

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { DepGraph, Package } from "../types/index.js";

interface LockEntry {
  version: string;
  link?: boolean;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

interface PackageLock {
  name?: string;
  lockfileVersion: number;
  packages: Record<string, LockEntry>;
}

function nameFromPath(path: string): string {
  const sep = "/node_modules/";
  const lastIdx = path.lastIndexOf(sep);
  if (lastIdx !== -1) return path.slice(lastIdx + sep.length);
  return path.startsWith("node_modules/") ? path.slice("node_modules/".length) : path;
}

function resolveNpmDep(
  fromPath: string,
  depName: string,
  pathToId: Map<string, string>
): string | undefined {
  const parts = fromPath.split("/node_modules/");
  for (let i = parts.length; i >= 1; i--) {
    const prefix = parts.slice(0, i).join("/node_modules/");
    if (pathToId.has(`${prefix}/node_modules/${depName}`)) {
      return pathToId.get(`${prefix}/node_modules/${depName}`);
    }
  }
  return pathToId.get(`node_modules/${depName}`);
}

export function parseNpm(projectPath: string): DepGraph {
  const raw = readFileSync(join(projectPath, "package-lock.json"), "utf8");
  const lock = JSON.parse(raw) as PackageLock;

  if (lock.lockfileVersion < 2) {
    throw new Error(
      "package-lock.json v1 is not supported. Run `npm install` to upgrade to v2/v3."
    );
  }

  const pkgMap = new Map<string, Package>();
  const pathToId = new Map<string, string>();

  for (const [path, entry] of Object.entries(lock.packages)) {
    if (path === "" || entry.link) continue;
    const name = nameFromPath(path);
    const key = `${name}@${entry.version}`;
    if (!pkgMap.has(key)) pkgMap.set(key, { name, version: entry.version });
    pathToId.set(path, key);
  }

  const deps = new Map<string, string[]>();

  for (const [path, entry] of Object.entries(lock.packages)) {
    if (path === "" || entry.link) continue;
    const fromKey = pathToId.get(path);
    if (!fromKey) continue;

    const depKeys: string[] = [];
    for (const depName of Object.keys(entry.dependencies ?? {})) {
      const resolved = resolveNpmDep(path, depName, pathToId);
      if (resolved) depKeys.push(resolved);
    }
    deps.set(fromKey, depKeys);
  }

  const roots: string[] = [];
  const rootEntry = lock.packages[""];
  if (rootEntry) {
    const rootDeps = { ...rootEntry.dependencies, ...rootEntry.devDependencies };
    for (const depName of Object.keys(rootDeps)) {
      const key = pathToId.get(`node_modules/${depName}`);
      if (key) roots.push(key);
    }
  }

  return {
    ecosystem: "npm",
    projectName: lock.name ?? "(project)",
    packages: pkgMap,
    deps,
    roots,
  };
}

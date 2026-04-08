import type { DepGraph } from "../types/index.js";

export function buildReverseMap(graph: DepGraph): Map<string, string[]> {
  const reverse = new Map<string, string[]>();
  for (const key of graph.packages.keys()) reverse.set(key, []);

  for (const [from, depList] of graph.deps) {
    for (const to of depList) {
      reverse.get(to)?.push(from);
    }
  }

  return reverse;
}

export function findReverseDeps(graph: DepGraph, pkgName: string): string[] {
  const targets = [...graph.packages.entries()]
    .filter(([, pkg]) => pkg.name === pkgName)
    .map(([key]) => key);

  if (targets.length === 0) return [];

  const reverse = buildReverseMap(graph);
  const visited = new Set<string>();
  const queue   = [...targets];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const parent of reverse.get(current) ?? []) {
      if (!visited.has(parent)) {
        visited.add(parent);
        queue.push(parent);
      }
    }
  }

  return [...visited];
}

import type { DepGraph, CycleResult } from "../types/index.js";

type Color = "white" | "gray" | "black";

export function detectCycles(graph: DepGraph): CycleResult {
  const color = new Map<string, Color>();
  const cycles: string[][] = [];
  const path: string[] = [];

  for (const key of graph.packages.keys()) color.set(key, "white");

  function dfs(node: string): void {
    color.set(node, "gray");
    path.push(node);

    for (const dep of graph.deps.get(node) ?? []) {
      const depColor = color.get(dep);
      if (depColor === "gray") {
        const start = path.indexOf(dep);
        cycles.push([...path.slice(start), dep]);
      } else if (depColor === "white") {
        dfs(dep);
      }
    }

    path.pop();
    color.set(node, "black");
  }

  for (const key of graph.packages.keys()) {
    if (color.get(key) === "white") dfs(key);
  }

  return { hasCycles: cycles.length > 0, cycles };
}

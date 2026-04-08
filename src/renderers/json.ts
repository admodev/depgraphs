import type { DepGraph, CycleResult } from "../types/index.js";

export function renderJson(graph: DepGraph, cycles?: CycleResult): string {
  const output = {
    ecosystem:   graph.ecosystem,
    projectName: graph.projectName,
    roots:       graph.roots,
    packages: [...graph.packages.entries()].map(([id, pkg]) => ({
      id,
      name:    pkg.name,
      version: pkg.version,
      deps:    graph.deps.get(id) ?? [],
    })),
    ...(cycles ? { cycles: cycles.cycles } : {}),
  };

  return JSON.stringify(output, null, 2);
}

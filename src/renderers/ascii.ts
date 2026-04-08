import type { DepGraph } from "../types/index.js";
import { buildReverseMap } from "../graph/reverse.js";

const BRANCH = "├── ";
const LAST   = "└── ";
const PIPE   = "│   ";
const SPACE  = "    ";

export function renderAscii(graph: DepGraph, maxDepth: number | null): string {
  const lines: string[] = [`${graph.projectName} (${graph.ecosystem})`];
  const globalSeen = new Set<string>();

  for (let i = 0; i < graph.roots.length; i++) {
    const root = graph.roots[i]!;
    renderNode(root, "", i === graph.roots.length - 1, maxDepth, globalSeen, new Set(), graph, lines);
  }

  return lines.join("\n");
}

function renderNode(
  key: string,
  prefix: string,
  isLast: boolean,
  remainingDepth: number | null,
  globalSeen: Set<string>,
  inPath: Set<string>,
  graph: DepGraph,
  lines: string[]
): void {
  const connector = isLast ? LAST : BRANCH;
  const pkg       = graph.packages.get(key);
  const label     = pkg ? `${pkg.name}@${pkg.version}` : key;

  if (inPath.has(key)) {
    lines.push(`${prefix}${connector}${label} (cycle)`);
    return;
  }

  if (globalSeen.has(key)) {
    lines.push(`${prefix}${connector}${label} (*)`);
    return;
  }

  lines.push(`${prefix}${connector}${label}`);
  globalSeen.add(key);

  if (remainingDepth === 0) return;

  const children    = graph.deps.get(key) ?? [];
  const childPrefix = prefix + (isLast ? SPACE : PIPE);
  const childDepth  = remainingDepth === null ? null : remainingDepth - 1;

  inPath.add(key);
  for (let i = 0; i < children.length; i++) {
    renderNode(children[i]!, childPrefix, i === children.length - 1, childDepth, globalSeen, inPath, graph, lines);
  }
  inPath.delete(key);
}

export function renderReverseAscii(
  graph: DepGraph,
  pkgName: string,
  maxDepth: number | null
): string {
  const reverse  = buildReverseMap(graph);
  const targets  = [...graph.packages.entries()]
    .filter(([, pkg]) => pkg.name === pkgName)
    .map(([key]) => key);

  if (targets.length === 0) {
    return `Package "${pkgName}" not found in the dependency graph.`;
  }

  const lines: string[] = [];

  for (const targetKey of targets) {
    const pkg = graph.packages.get(targetKey)!;
    lines.push(`${pkg.name}@${pkg.version} (needed by)`);

    const globalSeen  = new Set<string>();
    const parents     = reverse.get(targetKey) ?? [];

    for (let i = 0; i < parents.length; i++) {
      renderReverseNode(parents[i]!, "", i === parents.length - 1, maxDepth, globalSeen, new Set(), reverse, graph, lines);
    }

    if (parents.length === 0) lines.push("  (nothing — this is a root package)");
  }

  return lines.join("\n");
}

function renderReverseNode(
  key: string,
  prefix: string,
  isLast: boolean,
  remainingDepth: number | null,
  globalSeen: Set<string>,
  inPath: Set<string>,
  reverse: Map<string, string[]>,
  graph: DepGraph,
  lines: string[]
): void {
  const connector = isLast ? LAST : BRANCH;
  const pkg       = graph.packages.get(key);
  const label     = pkg ? `${pkg.name}@${pkg.version}` : key;

  if (inPath.has(key)) {
    lines.push(`${prefix}${connector}${label} (cycle)`);
    return;
  }

  if (globalSeen.has(key)) {
    lines.push(`${prefix}${connector}${label} (*)`);
    return;
  }

  lines.push(`${prefix}${connector}${label}`);
  globalSeen.add(key);

  if (remainingDepth === 0) return;

  const parents     = reverse.get(key) ?? [];
  const childPrefix = prefix + (isLast ? SPACE : PIPE);
  const childDepth  = remainingDepth === null ? null : remainingDepth - 1;

  inPath.add(key);
  for (let i = 0; i < parents.length; i++) {
    renderReverseNode(parents[i]!, childPrefix, i === parents.length - 1, childDepth, globalSeen, inPath, reverse, graph, lines);
  }
  inPath.delete(key);
}

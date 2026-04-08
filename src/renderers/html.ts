import Handlebars from "handlebars";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { DepGraph } from "../types/index.js";

const __dirname    = dirname(fileURLToPath(import.meta.url));
const MODULES_ROOT = join(__dirname, "..", "..", "node_modules");
const TEMPLATE     = join(__dirname, "..", "templates", "graph.hbs");

interface CyNode {
  data: { id: string; label: string; name: string; version: string; isRoot?: true };
}

interface CyEdge {
  data: { id: string; source: string; target: string };
}

function buildElements(graph: DepGraph): Array<CyNode | CyEdge> {
  const rootSet  = new Set(graph.roots);
  const elements: Array<CyNode | CyEdge> = [];

  for (const [id, pkg] of graph.packages) {
    const node: CyNode = {
      data: { id, label: `${pkg.name}\n${pkg.version}`, name: pkg.name, version: pkg.version },
    };
    if (rootSet.has(id)) node.data.isRoot = true;
    elements.push(node);
  }

  for (const [source, depList] of graph.deps) {
    for (const target of depList) {
      elements.push({ data: { id: `${source}__${target}`, source, target } });
    }
  }

  return elements;
}

function safeJsonForScript(value: unknown): string {
  return JSON.stringify(value).replace(/<\/(script)/gi, "<\\/$1");
}

export function renderHtml(graph: DepGraph): string {
  const source   = readFileSync(TEMPLATE, "utf8");
  const compiled = Handlebars.compile(source);

  const cytoscapeJs      = readFileSync(join(MODULES_ROOT, "cytoscape", "dist", "cytoscape.min.js"), "utf8");
  const dagreJs          = readFileSync(join(MODULES_ROOT, "dagre", "dist", "dagre.min.js"), "utf8");
  const cytoscapeDagreJs = readFileSync(join(MODULES_ROOT, "cytoscape-dagre", "cytoscape-dagre.js"), "utf8");

  const elements   = buildElements(graph);
  const edgeCount  = elements.filter(e => "source" in e.data).length;

  return compiled({
    title:           graph.projectName,
    ecosystem:       graph.ecosystem,
    packageCount:    graph.packages.size,
    edgeCount,
    elementsJson:    safeJsonForScript(elements),
    cytoscapeJs,
    dagreJs,
    cytoscapeDagreJs,
  });
}

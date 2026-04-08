#!/usr/bin/env node
import { parseArgs } from "node:util";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { ECOSYSTEMS, OUTPUT_FORMATS } from "./constants/index.js";
import type { Ecosystem, OutputFormat } from "./types/index.js";
import { detectEcosystem, parseProject } from "./parsers/detector.js";
import { detectCycles } from "./graph/cycles.js";
import { renderAscii, renderReverseAscii } from "./renderers/ascii.js";
import { renderJson } from "./renderers/json.js";
import { renderHtml } from "./renderers/html.js";

interface CliOptions {
  path:      string;
  ecosystem: Ecosystem | null;
  depth:     number | null;
  cycles:    boolean;
  outdated:  boolean;
  reverse:   string | null;
  output:    OutputFormat;
}

const __dirname = dirname(fileURLToPath(import.meta.url));

function readVersion(): string {
  try {
    const pkg = JSON.parse(
      readFileSync(join(__dirname, "..", "package.json"), "utf8")
    ) as { version?: string };
    return pkg.version ?? "unknown";
  } catch {
    return "unknown";
  }
}

function printHelp(): void {
  console.log(`
depgraphs v${readVersion()} — dependency graph explorer

USAGE
  depgraphs [options] [path]

  [path]  Project root to analyse (default: current directory)

OPTIONS
  -e, --ecosystem <eco>    Target ecosystem: ${ECOSYSTEMS.join(", ")}
                           Auto-detected from lockfile if omitted.
  -d, --depth <n>          Max traversal depth (0 = direct deps only).
  --cycles                 Detect and report dependency cycles.
  --outdated               Flag packages with newer versions (npm only).
  -r, --reverse <pkg>      Show what depends on <pkg>.
  -o, --output <fmt>       Output format: ${OUTPUT_FORMATS.join(", ")} (default: ascii)
  -V, --version            Print version and exit.
  -h, --help               Print this help and exit.

EXAMPLES
  depgraphs                          Auto-detect and render tree
  depgraphs ./myapp -e npm           Force npm ecosystem
  depgraphs --depth 2                Limit tree to 2 levels
  depgraphs --cycles                 Report circular dependencies
  depgraphs --reverse express        Show what depends on express
  depgraphs -o json | jq .           Output as JSON
  depgraphs -o html > graph.html     Generate interactive HTML graph
`);
}

function parseCliArgs(argv: string[]): CliOptions {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      ecosystem: { type: "string",  short: "e" },
      depth:     { type: "string",  short: "d" },
      cycles:    { type: "boolean"              },
      outdated:  { type: "boolean"              },
      reverse:   { type: "string",  short: "r" },
      output:    { type: "string",  short: "o" },
      version:   { type: "boolean", short: "V" },
      help:      { type: "boolean", short: "h" },
    },
  });

  if (values.help)    { printHelp(); process.exit(0); }
  if (values.version) { console.log(readVersion()); process.exit(0); }

  let ecosystem: Ecosystem | null = null;
  if (values.ecosystem !== undefined) {
    if (!(ECOSYSTEMS as readonly string[]).includes(values.ecosystem)) {
      console.error(`error: unknown ecosystem "${values.ecosystem}". Valid: ${ECOSYSTEMS.join(", ")}`);
      process.exit(1);
    }
    ecosystem = values.ecosystem as Ecosystem;
  }

  let depth: number | null = null;
  if (values.depth !== undefined) {
    const n = Number(values.depth);
    if (!Number.isInteger(n) || n < 0) {
      console.error("error: --depth must be a non-negative integer");
      process.exit(1);
    }
    depth = n;
  }

  const outputRaw = values.output ?? "ascii";
  if (!(OUTPUT_FORMATS as readonly string[]).includes(outputRaw)) {
    console.error(`error: unknown output format "${outputRaw}". Valid: ${OUTPUT_FORMATS.join(", ")}`);
    process.exit(1);
  }

  return {
    path:      positionals[0] ?? process.cwd(),
    ecosystem,
    depth,
    cycles:    values.cycles  ?? false,
    outdated:  values.outdated ?? false,
    reverse:   values.reverse ?? null,
    output:    outputRaw as OutputFormat,
  };
}

function main(): void {
  const opts = parseCliArgs(process.argv.slice(2));

  const ecosystem = opts.ecosystem ?? detectEcosystem(opts.path);
  if (!ecosystem) {
    console.error(
      "error: could not detect ecosystem. No supported lockfile found.\n" +
      "       Use --ecosystem to specify one, or run the tool in a project directory."
    );
    process.exit(1);
  }

  let graph;
  try {
    graph = parseProject(opts.path, ecosystem);
  } catch (err) {
    console.error(`error: ${(err as Error).message}`);
    process.exit(1);
  }

  if (opts.reverse !== null) {
    console.log(renderReverseAscii(graph, opts.reverse, opts.depth));
    return;
  }

  if (opts.cycles) {
    const result = detectCycles(graph);
    if (!result.hasCycles) {
      console.log("No cycles detected.");
    } else {
      console.log(`Found ${result.cycles.length} cycle(s):\n`);
      for (const cycle of result.cycles) {
        console.log(`  ${cycle.join(" → ")}`);
      }
    }
    return;
  }

  if (opts.outdated) {
    console.error("error: --outdated is not yet implemented");
    process.exit(1);
  }

  switch (opts.output) {
    case "ascii":
      console.log(renderAscii(graph, opts.depth));
      break;
    case "json":
      console.log(renderJson(graph));
      break;
    case "html":
      process.stdout.write(renderHtml(graph));
      break;
    default:
      console.error(`error: output format "${opts.output}" is not yet implemented`);
      process.exit(1);
  }
}

main();

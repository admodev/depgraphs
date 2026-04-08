import { parseArgs } from "node:util";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { ECOSYSTEMS, OUTPUT_FORMATS } from "./constants/index.js";
import type { Ecosystem, OutputFormat } from "./types/index.js";

export interface CliOptions {
  path: string;
  ecosystem: Ecosystem | null; // null = auto-detect
  depth: number | null;        // null = unlimited
  cycles: boolean;
  outdated: boolean;
  vuln: boolean;
  output: OutputFormat;
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
  const version = readVersion();
  console.log(`
depgraphs v${version} — dependency graph explorer

USAGE
  depgraphs [options] [path]

  [path]  Root directory of the project to analyse (default: current directory)

OPTIONS
  -e, --ecosystem <ecosystem>   Target ecosystem: ${ECOSYSTEMS.join(", ")}
                                Auto-detected from manifest files if omitted.
  -d, --depth <n>               Maximum traversal depth (default: unlimited).
  --cycles                      Detect and report dependency cycles.
  --outdated                    Flag packages that have newer versions available.
  --vuln                        Flag packages with known vulnerabilities.
  -o, --output <format>         Output format: ${OUTPUT_FORMATS.join(", ")}
                                (default: ascii)
  -V, --version                 Print version and exit.
  -h, --help                    Print this help message and exit.

EXAMPLES
  depgraphs                          Analyse current directory (auto-detect)
  depgraphs ./my-project -e npm      Force npm ecosystem
  depgraphs -e cargo --cycles        Detect cycles in a Cargo workspace
  depgraphs -e pip --outdated --vuln Audit a Python project
  depgraphs -o json | jq .           Output as JSON and pipe to jq
`);
}

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseCliArgs(argv: string[]): CliOptions {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      ecosystem: { type: "string",  short: "e" },
      depth:     { type: "string",  short: "d" },
      cycles:    { type: "boolean"              },
      outdated:  { type: "boolean"              },
      vuln:      { type: "boolean"              },
      output:    { type: "string",  short: "o" },
      version:   { type: "boolean", short: "V" },
      help:      { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    printHelp();
    process.exit(0);
  }

  if (values.version) {
    console.log(readVersion());
    process.exit(0);
  }

  // -- ecosystem ------------------------------------------------------------
  let ecosystem: Ecosystem | null = null;
  if (values.ecosystem !== undefined) {
    if (!(ECOSYSTEMS as readonly string[]).includes(values.ecosystem)) {
      console.error(
        `error: unknown ecosystem "${values.ecosystem}". ` +
        `Valid options: ${ECOSYSTEMS.join(", ")}`
      );
      process.exit(1);
    }
    ecosystem = values.ecosystem as Ecosystem;
  }

  // -- depth ----------------------------------------------------------------
  let depth: number | null = null;
  if (values.depth !== undefined) {
    const parsed = Number(values.depth);
    if (!Number.isInteger(parsed) || parsed < 1) {
      console.error("error: --depth must be a positive integer");
      process.exit(1);
    }
    depth = parsed;
  }

  // -- output ---------------------------------------------------------------
  const outputRaw = values.output ?? "ascii";
  if (!(OUTPUT_FORMATS as readonly string[]).includes(outputRaw)) {
    console.error(
      `error: unknown output format "${outputRaw}". ` +
      `Valid options: ${OUTPUT_FORMATS.join(", ")}`
    );
    process.exit(1);
  }

  return {
    path:      positionals[0] ?? process.cwd(),
    ecosystem,
    depth,
    cycles:    values.cycles  ?? false,
    outdated:  values.outdated ?? false,
    vuln:      values.vuln    ?? false,
    output:    outputRaw as OutputFormat,
  };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const options = parseCliArgs(process.argv.slice(2));
console.log("parsed options:", options); // placeholder until core is wired up

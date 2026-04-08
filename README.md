# depgraphs

A fast, zero-config CLI for exploring dependency graphs across multiple ecosystems. Renders trees in your terminal, outputs structured JSON, or generates a fully self-contained interactive HTML graph — no server required.

## Features

- **Auto-detection** — finds the right lockfile automatically (`package-lock.json`, `Cargo.lock`, `go.sum`, `requirements.txt`)
- **Multi-ecosystem** — npm, Cargo (Go and pip parsers planned)
- **Three output formats** — ASCII tree, JSON, interactive HTML
- **Cycle detection** — DFS-based, reports every cycle found
- **Reverse lookup** — shows which packages depend on a given package
- **Depth control** — limit traversal to avoid noise in large graphs
- **Self-contained HTML** — bundles Cytoscape.js inline; open the file in any browser, no CDN needed

## Installation

```bash
# Clone and build
git clone https://github.com/youruser/depgraphs.git
cd depgraphs
npm install
npm run build

# Link globally (optional)
npm link
```

## Usage

```
depgraphs v1.0.0 — dependency graph explorer

USAGE
  depgraphs [options] [path]

  [path]  Project root to analyse (default: current directory)

OPTIONS
  -e, --ecosystem <eco>    Target ecosystem: npm, cargo, go, pip
                           Auto-detected from lockfile if omitted.
  -d, --depth <n>          Max traversal depth (0 = direct deps only).
  --cycles                 Detect and report dependency cycles.
  --outdated               Flag packages with newer versions (npm only).
  -r, --reverse <pkg>      Show what depends on <pkg>.
  -o, --output <fmt>       Output format: ascii, json, dot, html (default: ascii)
  -V, --version            Print version and exit.
  -h, --help               Print this help and exit.
```

---

## Examples

### ASCII tree (default)

Run from any project directory — the ecosystem is auto-detected from the lockfile:

```bash
$ depgraphs
```

```
depgraphs (npm)
├── cytoscape@3.33.2
├── cytoscape-dagre@2.5.0
│   └── dagre@0.8.5
│       ├── graphlib@2.1.8
│       │   └── lodash@4.18.1
│       └── lodash@4.18.1 (*)
├── handlebars@4.7.9
│   ├── minimist@1.2.8
│   ├── neo-async@2.6.2
│   ├── source-map@0.6.1
│   └── wordwrap@1.0.0
├── typescript@6.0.2
└── @types/node@25.5.2
    └── undici-types@7.18.2
```

> Packages marked `(*)` have already been printed elsewhere in the tree (deduplication). Packages marked `(cycle)` form a circular dependency.

---

### Limit depth

Use `--depth` / `-d` to cap traversal. `0` shows only direct dependencies:

```bash
$ depgraphs --depth 1
```

```
depgraphs (npm)
├── cytoscape@3.33.2
├── cytoscape-dagre@2.5.0
│   └── dagre@0.8.5
├── handlebars@4.7.9
│   ├── minimist@1.2.8
│   ├── neo-async@2.6.2
│   ├── source-map@0.6.1
│   └── wordwrap@1.0.0
├── typescript@6.0.2
└── @types/node@25.5.2
    └── undici-types@7.18.2
```

---

### Reverse lookup

Find out which packages pull in a specific dependency:

```bash
$ depgraphs --reverse lodash
```

```
lodash@4.18.1 (needed by)
├── dagre@0.8.5
│   └── cytoscape-dagre@2.5.0
└── graphlib@2.1.8
    └── dagre@0.8.5 (*)
```

---

### Cycle detection

Runs a DFS across the entire graph and reports every cycle found:

```bash
$ depgraphs --cycles
```

```
No cycles detected.
```

When cycles exist:

```
Found 2 cycle(s):

  pkgA@1.0.0 → pkgB@2.0.0 → pkgC@0.5.0 → pkgA@1.0.0
  pkgD@3.1.0 → pkgD@3.1.0
```

---

### JSON output

Machine-readable graph — pipe into `jq` for further processing:

```bash
$ depgraphs -o json | jq '.roots'
```

```json
{
  "ecosystem": "npm",
  "projectName": "depgraphs",
  "roots": [
    "cytoscape@3.33.2",
    "cytoscape-dagre@2.5.0",
    "handlebars@4.7.9",
    "typescript@6.0.2",
    "@types/node@25.5.2"
  ],
  "packages": [
    {
      "id": "@types/node@25.5.2",
      "name": "@types/node",
      "version": "25.5.2",
      "deps": ["undici-types@7.18.2"]
    },
    ...
  ]
}
```

---

### Interactive HTML graph

Generates a fully self-contained HTML file with an interactive DAG powered by [Cytoscape.js](https://js.cytoscape.org/) and the Dagre layout engine:

```bash
$ depgraphs -o html > graph.html
$ open graph.html        # macOS
$ xdg-open graph.html   # Linux
```

The graph renders a dark-themed interactive canvas:

- **Hover** over any node to see its name, version, and direct dependency count
- **Click** a node to highlight its neighborhood and dim everything else
- **Scroll / pinch** to zoom; **drag** to pan
- Direct dependencies are rendered in blue, transitive ones in grey
- The file is fully self-contained — no internet connection needed

> Because all JavaScript (Cytoscape.js, Dagre, cytoscape-dagre) is bundled inline, the file is large but completely portable.

---

### Analyse a different directory

Pass a path as the first positional argument:

```bash
$ depgraphs ~/projects/my-rust-app -e cargo
```

Force an ecosystem when the lockfile is in a non-standard location:

```bash
$ depgraphs ./monorepo/packages/api --ecosystem npm
```

---

## Supported ecosystems

| Ecosystem | Lockfile            | Status      |
|-----------|---------------------|-------------|
| npm       | `package-lock.json` | Supported   |
| Cargo     | `Cargo.lock`        | Supported   |
| Go        | `go.sum`            | Planned     |
| pip       | `requirements.txt`  | Planned     |

---

## Architecture

```
src/
├── index.ts            # CLI entry point, arg parsing
├── constants/          # Ecosystem names, output formats, lockfile map
├── types/              # Shared TypeScript interfaces (DepGraph, Package, …)
├── parsers/
│   ├── detector.ts     # Auto-detects ecosystem from lockfile presence
│   ├── npm.ts          # Parses package-lock.json v2/v3
│   └── cargo.ts        # Parses Cargo.lock (TOML)
├── graph/
│   ├── cycles.ts       # DFS-based cycle detection (three-colour algorithm)
│   └── reverse.ts      # Builds inverted adjacency map for --reverse
├── renderers/
│   ├── ascii.ts        # Box-drawing tree renderer with deduplication
│   ├── json.ts         # Serialises DepGraph to structured JSON
│   └── html.ts         # Handlebars + Cytoscape.js bundled HTML renderer
└── templates/
    └── graph.hbs       # HTML template for the interactive graph
```

The core data structure is `DepGraph`:

```ts
interface DepGraph {
  ecosystem:   Ecosystem;          // "npm" | "cargo" | "go" | "pip"
  projectName: string;
  packages:    Map<string, Package>; // id → { name, version }
  deps:        Map<string, string[]>; // id → [dep-id, …]
  roots:       string[];            // direct dependencies of the project
}
```

All renderers are pure functions over `DepGraph` — adding a new output format means adding a single file.

---

## Development

```bash
npm install
npm run build       # tsc + copies templates to build/
node build/index.js # run from this directory
```

---

## License

ISC

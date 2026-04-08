import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Ecosystem, DepGraph } from "../types/index.js";
import { ECOSYSTEM_LOCKFILES } from "../constants/index.js";
import { parseNpm } from "./npm.js";
import { parseCargo } from "./cargo.js";

export function detectEcosystem(projectPath: string): Ecosystem | null {
  for (const [file, eco] of Object.entries(ECOSYSTEM_LOCKFILES)) {
    if (existsSync(join(projectPath, file))) return eco as Ecosystem;
  }
  return null;
}

export function parseProject(projectPath: string, ecosystem: Ecosystem): DepGraph {
  switch (ecosystem) {
    case "npm":   return parseNpm(projectPath);
    case "cargo": return parseCargo(projectPath);
    default:
      throw new Error(`Ecosystem "${ecosystem}" is not yet supported`);
  }
}

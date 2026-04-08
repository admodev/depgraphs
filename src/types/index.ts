export type Ecosystem = "npm" | "cargo" | "go" | "pip";
export type OutputFormat = "ascii" | "json" | "dot" | "html";

export interface Package {
  name: string;
  version: string;
}

export interface DepGraph {
  ecosystem: Ecosystem;
  projectName: string;
  packages: Map<string, Package>;
  deps: Map<string, string[]>;
  roots: string[];
}

export interface CycleResult {
  hasCycles: boolean;
  cycles: string[][];
}

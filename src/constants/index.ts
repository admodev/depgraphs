export const ECOSYSTEMS = ["npm", "cargo", "go", "pip"] as const;
export const OUTPUT_FORMATS = ["ascii", "json", "dot", "html"] as const;

export const ECOSYSTEM_LOCKFILES: Record<string, string> = {
  "package-lock.json": "npm",
  "Cargo.lock":        "cargo",
  "go.sum":            "go",
  "requirements.txt":  "pip",
};

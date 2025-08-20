// Robust verifier: accepts API routes at repo root (api/*) or under web/api/*
// Prints exactly what it looked for and what's actually present.

import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const roots = ["." , "web"]; // check both layouts
const required = ["ai-health-tip.ts", "checkout.ts"];

function dirList(path) {
  try {
    return readdirSync(path).map((name) => {
      const full = join(path, name);
      const isDir = (() => { try { return statSync(full).isDirectory(); } catch { return false; } })();
      return (isDir ? "[DIR] " : "      ") + name;
    }).join("\n");
  } catch {
    return "(missing)";
  }
}

let found = false;
for (const root of roots) {
  const paths = required.map((f) => join(root, "api", f));
  const ok = paths.every((p) => existsSync(p));
  console.log(`Checking ${root === "." ? "repo root" : root}/api …`);
  console.log(paths.map((p) => `  - ${existsSync(p) ? "✓" : "✗"} ${p}`).join("\n"));
  if (ok) found = true;
}

if (!found) {
  console.error("\n❌ Verification failed. Missing required API routes.\n");
  console.error("Repository listing for quick debug:");
  console.error("\n./api");
  console.error(dirList("./api"));
  console.error("\n./web/api");
  console.error(dirList("./web/api"));
  console.error("\nTop-level files:");
  console.error(dirList("."));
  process.exit(1);
}

console.log("\n✓ API routes present");

// 載入 playwright：先試本地，失敗則從全域 node_modules 載入
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { join } from "node:path";

let cached;
export async function getPlaywright() {
  if (cached) return cached;
  try {
    cached = await import("playwright");
    if (!cached.chromium) cached = cached.default;
  } catch {
    const root = execSync("npm root -g").toString().trim();
    cached = createRequire(join(root, "noop.js"))("playwright");
  }
  return cached;
}

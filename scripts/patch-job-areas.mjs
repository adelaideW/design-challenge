#!/usr/bin/env node
/**
 * Re-apply company industry labels to existing job JSON (no network scrape).
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applyCompanyAreas } from "../src/lib/jobs.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SOURCES_PATH = path.join(__dirname, "job-sources.json");
const OUT_JOBS = path.join(ROOT, "src/data/jobs.json");
const OUT_PUBLIC_DIR = path.join(ROOT, "public/data/jobs");
const PAGE_SIZE = 50;

async function loadSources() {
  const raw = await fs.readFile(SOURCES_PATH, "utf8");
  return JSON.parse(raw);
}

async function patchFile(filePath, sources) {
  const raw = await fs.readFile(filePath, "utf8");
  const jobs = JSON.parse(raw);
  const patched = applyCompanyAreas(jobs, sources);
  await fs.writeFile(filePath, JSON.stringify(patched, null, 2) + "\n");
  return patched.length;
}

async function main() {
  const sources = await loadSources();
  const mainCount = await patchFile(OUT_JOBS, sources);

  const files = await fs.readdir(OUT_PUBLIC_DIR);
  const pageFiles = files.filter((f) => /^page-\d+\.json$/.test(f)).sort((a, b) => {
    const na = Number(a.match(/\d+/)?.[0] || 0);
    const nb = Number(b.match(/\d+/)?.[0] || 0);
    return na - nb;
  });

  for (const file of pageFiles) {
    await patchFile(path.join(OUT_PUBLIC_DIR, file), sources);
  }

  const allJobs = JSON.parse(await fs.readFile(OUT_JOBS, "utf8"));
  const designCount = allJobs.filter((j) => j.area === "Design").length;
  const areas = [...new Set(allJobs.map((j) => j.area))].sort();

  console.log(`Patched ${mainCount} jobs in ${OUT_JOBS}`);
  console.log(`Patched ${pageFiles.length} page files in ${OUT_PUBLIC_DIR}`);
  console.log(`Remaining area=Design: ${designCount}`);
  console.log(`Industries (${areas.length}): ${areas.join(", ")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

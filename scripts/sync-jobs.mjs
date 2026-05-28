#!/usr/bin/env node
/**
 * Build-time job sync for Role Hunter.
 * Fetches ATS boards + Built In SF listings, verifies URLs, writes src/data/jobs.json.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import {
  applyCompanyAreas,
  dedupeJobs,
  fetchJobsForSource,
  isDesignRole,
  normalizeBuiltinJob,
  resolveCompanyArea,
  buildCompanyAreaLookup,
  sortJobs,
} from "../src/lib/jobs.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SOURCES_PATH = path.join(__dirname, "job-sources.json");
const OUT_JOBS = path.join(ROOT, "src/data/jobs.json");
const OUT_META = path.join(ROOT, "src/data/jobs-meta.json");
const OUT_REPORT = path.join(__dirname, "sync-jobs-report.json");
const OUT_PUBLIC_DIR = path.join(ROOT, "public/data/jobs");
const PAGE_SIZE = 50;

const BUILTIN_URL =
  "https://www.builtinsf.com/jobs/remote/hybrid/office?search=product+designer&city=San+Francisco&state=California&country=USA&allLocations=true";

const VERIFY_TIMEOUT_MS = 12_000;
const MAX_BUILTIN_PAGES = 20;

async function loadSources() {
  const raw = await fs.readFile(SOURCES_PATH, "utf8");
  return JSON.parse(raw);
}

const TRUSTED_URL_HOSTS = [
  "greenhouse.io",
  "job-boards.greenhouse.io",
  "ashbyhq.com",
  "jobs.ashbyhq.com",
  "lever.co",
  "jobs.lever.co",
  "builtinsf.com",
  "builtin.com",
];

function isTrustedJobUrl(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return TRUSTED_URL_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

async function verifyUrl(url) {
  if (!url || !/^https?:\/\//i.test(url)) {
    return { ok: false, reason: "invalid-url" };
  }
  if (isTrustedJobUrl(url)) {
    return { ok: true, reason: "trusted-host" };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);
  try {
    let res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "RoleHunterSync/1.0" },
    });
    if (res.status === 405 || res.status === 403) {
      res = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        redirect: "follow",
        headers: { "User-Agent": "RoleHunterSync/1.0" },
      });
    }
    if (res.status === 404 || res.status === 410) {
      return { ok: false, reason: `http-${res.status}` };
    }
    if (res.status >= 400) {
      return { ok: false, reason: `http-${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err.name === "AbortError" ? "timeout" : "network" };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchAtsJobs(sources) {
  const jobs = [];
  const errors = [];
  for (const src of sources) {
    try {
      const batch = await fetchJobsForSource(src);
      jobs.push(...batch);
    } catch (err) {
      errors.push({ company: src.company, ats: src.ats, error: String(err.message) });
    }
  }
  return { jobs, errors };
}

function parseBuiltinPosted(text) {
  if (!text) return new Date().toISOString();
  const lower = text.toLowerCase();
  const now = new Date();
  if (lower.includes("hour")) {
    now.setHours(now.getHours() - 4);
    return now.toISOString();
  }
  const dayMatch = lower.match(/(\d+)\s*day/);
  if (dayMatch) {
    now.setDate(now.getDate() - Number(dayMatch[1]));
    return now.toISOString();
  }
  if (lower.includes("yesterday")) {
    now.setDate(now.getDate() - 1);
    return now.toISOString();
  }
  if (lower.includes("reposted")) {
    const m = lower.match(/reposted\s+(\d+)/);
    if (m) {
      now.setDate(now.getDate() - Number(m[1]));
      return now.toISOString();
    }
  }
  return now.toISOString();
}

async function fetchBuiltinJobs(sources) {
  const areaLookup = buildCompanyAreaLookup(sources);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const collected = [];

  try {
    for (let pageNum = 0; pageNum < MAX_BUILTIN_PAGES; pageNum++) {
      const pageUrl = `${BUILTIN_URL}&page=${pageNum + 1}`;
      await page.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await page.waitForTimeout(1200);

      const batch = await page.evaluate(() => {
        const results = [];
        const links = document.querySelectorAll('a[href*="/job/"]');

        const seen = new Set();
        for (const link of links) {
          const href = link.getAttribute("href");
          if (!href || !href.includes("/job/")) continue;
          const url = href.startsWith("http")
            ? href
            : `https://www.builtinsf.com${href.startsWith("/") ? href : `/${href}`}`;
          if (seen.has(url)) continue;
          seen.add(url);

          let title =
            link.querySelector("h2")?.textContent?.trim() ||
            link.closest("h2")?.textContent?.trim() ||
            link.textContent?.trim();
          if (!title) continue;

          const card =
            link.closest('[data-id="job-card"]') ||
            link.closest(".job-brief") ||
            link.closest("article") ||
            link.parentElement?.parentElement;

          let company = "";
          let location = "";
          let postedText = "";

          if (card) {
            const companyEl =
              card.querySelector('[data-id="company-title"]') ||
              card.querySelector(".company-title") ||
              card.querySelector("h3");
            company = companyEl?.textContent?.trim() || "";
            const locEl =
              card.querySelector('[data-id="job-location"]') ||
              card.querySelector(".job-location");
            location = locEl?.textContent?.trim() || "";
            const timeEl = card.querySelector("time");
            postedText = timeEl?.textContent?.trim() || "";
          }

          if (!company) {
            const img = card?.querySelector("img[alt]");
            if (img?.alt) company = img.alt.replace(/ logo$/i, "").trim();
          }

          results.push({ title, company, location, url, postedText });
        }
        return results;
      });

      for (const row of batch) {
        if (!isDesignRole(row.title)) continue;
        const company = row.company || "Unknown";
        const domain = company
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "")
          .concat(".com");
        const job = normalizeBuiltinJob({
          company,
          domain,
          role: row.title,
          location: row.location || "San Francisco, CA, USA",
          area: resolveCompanyArea(company, areaLookup),
          url: row.url,
          postedAt: parseBuiltinPosted(row.postedText),
        });
        if (job) collected.push(job);
      }

      // Stop early when listing pages run out of job links.
      if (batch.length < 10) break;
    }
  } finally {
    await browser.close();
  }

  return dedupeJobs(collected);
}

async function filterVerified(jobs) {
  const verified = [];
  const dropped = [];
  const concurrency = 8;
  let index = 0;

  async function worker() {
    while (index < jobs.length) {
      const i = index++;
      const job = jobs[i];
      const result = await verifyUrl(job.url);
      if (result.ok) {
        verified.push(job);
      } else {
        dropped.push({
          company: job.company,
          role: job.role,
          url: job.url,
          source: job.source,
          reason: result.reason,
        });
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return { verified, dropped };
}

async function main() {
  console.log("Role Hunter: syncing jobs…");
  const sources = await loadSources();
  const { jobs: atsJobs, errors: atsErrors } = await fetchAtsJobs(sources);
  console.log(`ATS: ${atsJobs.length} design roles from ${sources.length} companies`);

  let builtinJobs = [];
  try {
    builtinJobs = await fetchBuiltinJobs(sources);
    console.log(`Built In: ${builtinJobs.length} design roles`);
  } catch (err) {
    console.warn("Built In scrape failed:", err.message);
    atsErrors.push({ source: "builtin", error: String(err.message) });
  }

  const merged = dedupeJobs([...atsJobs, ...builtinJobs]);
  const withCompanyAreas = applyCompanyAreas(merged, sources);
  console.log(`Merged: ${withCompanyAreas.length} unique roles — verifying URLs…`);

  const { verified, dropped } = await filterVerified(withCompanyAreas);
  const sorted = sortJobs(verified);

  await fs.mkdir(path.dirname(OUT_JOBS), { recursive: true });
  await fs.writeFile(OUT_JOBS, JSON.stringify(sorted, null, 2) + "\n");

  await fs.mkdir(OUT_PUBLIC_DIR, { recursive: true });
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  for (let i = 0; i < pageCount; i++) {
    const page = sorted.slice(i * PAGE_SIZE, (i + 1) * PAGE_SIZE);
    await fs.writeFile(
      path.join(OUT_PUBLIC_DIR, `page-${i + 1}.json`),
      JSON.stringify(page, null, 2) + "\n",
    );
  }

  const meta = {
    generatedAt: new Date().toISOString(),
    counts: {
      ats: atsJobs.length,
      builtin: builtinJobs.length,
      merged: merged.length,
      verified: sorted.length,
      dropped: dropped.length,
    },
    sources: sources.length,
  };
  await fs.writeFile(OUT_META, JSON.stringify(meta, null, 2) + "\n");
  await fs.writeFile(
    path.join(OUT_PUBLIC_DIR, "meta.json"),
    JSON.stringify({
      generatedAt: meta.generatedAt,
      totalCount: sorted.length,
      pageSize: PAGE_SIZE,
      pageCount,
    }, null, 2) + "\n",
  );

  const report = {
    generatedAt: meta.generatedAt,
    atsErrors,
    dropped,
    sampleTitles: sorted.slice(0, 8).map((j) => `${j.company} — ${j.role}`),
  };
  await fs.writeFile(OUT_REPORT, JSON.stringify(report, null, 2) + "\n");

  console.log(`Wrote ${sorted.length} verified jobs → ${OUT_JOBS}`);
  if (dropped.length) console.log(`Dropped ${dropped.length} (see sync-jobs-report.json)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

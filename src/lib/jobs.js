/** @typedef {{ company: string, domain: string, ats: string, board: string, area: string }} JobSource */

const DESIGN_TITLE_PATTERNS = [
  /\bproduct designer\b/i,
  /\bux designer\b/i,
  /\bui designer\b/i,
  /\bdesign engineer\b/i,
  /\bux researcher\b/i,
  /\buser researcher\b/i,
  /\bvisual designer\b/i,
  /\binteraction designer\b/i,
  /\bcontent designer\b/i,
  /\bbrand designer\b/i,
  /\bdesign systems?\b/i,
  /\bmotion designer\b/i,
  /\bhead of design\b/i,
  /\bdesign lead\b/i,
  /\bstaff product designer\b/i,
  /\bstaff designer\b/i,
  /\bsenior product designer\b/i,
  /\bsenior designer\b/i,
  /\bprincipal product designer\b/i,
  /\bprincipal designer\b/i,
  /\bfounding product designer\b/i,
  /\bai product designer\b/i,
  /\bcreative studio\b/i,
  /\bhead of (?:anthropic )?creative\b/i,
  /\bgraphic designer\b/i,
];

const DESIGN_TITLE_EXCLUSIONS = [
  /\bresearch scientist\b/i,
  /\bresearch engineer\b/i,
  /\bresearch economist\b/i,
  /\bresearch manager\b/i,
  /\bmachine learning\b/i,
  /\bdata center design\b/i,
  /\bpolicy design manager\b/i,
  /\bpeople research scientist\b/i,
  /\bbiological safety research\b/i,
  /\bcontracts manager\b/i,
  /\baccount executive\b/i,
  /\bactuator\b/i,
  /\bphysical design engineer\b/i,
  /\bhardware design\b/i,
  /\bpkg engineer\b/i,
  /\bforward deployed engineering\b/i,
];

const DESIGN_ENGINEER_ALLOW = [
  /\bdesign engineer,\s*web\b/i,
  /\bdesign engineer,\s*ai\b/i,
  /\bproduct design engineer\b/i,
  /\bux\b/i,
  /\beducation labs\b/i,
];

const SOURCE_PRIORITY = {
  greenhouse: 3,
  ashby: 3,
  lever: 3,
  builtin: 1,
  adzuna: 1,
};

export function faviconUrl(domain) {
  return `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;
}

export function isDesignRole(title) {
  const t = (title || "").trim();
  if (!t) return false;
  if (DESIGN_TITLE_EXCLUSIONS.some((re) => re.test(t))) return false;
  if (/\bdesign engineer\b/i.test(t)) {
    return DESIGN_ENGINEER_ALLOW.some((re) => re.test(t));
  }
  if (DESIGN_TITLE_PATTERNS.some((re) => re.test(t))) return true;
  if (/\bdesigner\b/i.test(t) && !/\bsoftware\b/i.test(t)) return true;
  return false;
}

export function daysSince(isoDate) {
  if (!isoDate) return 0;
  const then = new Date(isoDate);
  if (Number.isNaN(then.getTime())) return 0;
  const now = new Date();
  return Math.max(0, Math.floor((now - then) / (1000 * 60 * 60 * 24)));
}

export function formatPosted(postedDays) {
  const d = postedDays ?? 0;
  if (d <= 0) return "Today";
  if (d < 7) return `${d}d ago`;
  if (d < 28) return `${Math.floor(d / 7)}w ago`;
  return `${Math.floor(d / 28)}mo ago`;
}

export function normalizeKey(company, role, location) {
  const norm = (s) =>
    (s || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  return `${norm(company)}|${norm(role)}|${norm(location)}`;
}

function stableId(source, url, company, role) {
  const base = `${source}:${url || company}:${role}`;
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    hash = (hash << 5) - hash + base.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * @param {object} p
 * @returns {import('./jobs.js').Job | null}
 */
export function makeJob({
  company,
  domain,
  role,
  location,
  area,
  url,
  postedAt,
  source,
}) {
  if (!isDesignRole(role) || !url) return null;
  const postedDays = daysSince(postedAt);
  return {
    id: stableId(source, url, company, role),
    company,
    logo: faviconUrl(domain),
    role: role.trim(),
    location: (location || "Remote").trim(),
    area: area || "Other",
    url,
    postedAt: postedAt || new Date().toISOString(),
    postedDays,
    source,
  };
}

/**
 * @param {JobSource} src
 * @param {object} raw
 */
export function normalizeGreenhouseJob(src, raw) {
  const postedAt = raw.updated_at || raw.first_published;
  return makeJob({
    company: src.company,
    domain: src.domain,
    role: raw.title,
    location: raw.location?.name || "Remote",
    area: src.area,
    url: raw.absolute_url,
    postedAt,
    source: "greenhouse",
  });
}

/**
 * @param {JobSource} src
 * @param {object} raw
 */
export function normalizeAshbyJob(src, raw) {
  const loc =
    raw.location ||
    (raw.locationName ? raw.locationName : null) ||
    (Array.isArray(raw.locations) ? raw.locations.join("; ") : null) ||
    "Remote";
  const postedAt = raw.publishedAt || raw.updatedAt;
  return makeJob({
    company: src.company,
    domain: src.domain,
    role: raw.title,
    location: typeof loc === "string" ? loc : "Remote",
    area: src.area,
    url: raw.jobUrl,
    postedAt,
    source: "ashby",
  });
}

/**
 * @param {JobSource} src
 * @param {object} raw
 */
export function normalizeLeverJob(src, raw) {
  const loc =
    raw.categories?.location ||
    (raw.workplaceType ? `${raw.workplaceType}` : "Remote");
  return makeJob({
    company: src.company,
    domain: src.domain,
    role: raw.text,
    location: loc,
    area: src.area,
    url: raw.hostedUrl,
    postedAt: raw.createdAt ? new Date(raw.createdAt).toISOString() : undefined,
    source: "lever",
  });
}

export function normalizeBuiltinJob({ company, domain, role, location, area, url, postedAt }) {
  return makeJob({
    company,
    domain: domain || `${company.toLowerCase().replace(/\s+/g, "")}.com`,
    role,
    location,
    area: area || "Other",
    url,
    postedAt,
    source: "builtin",
  });
}

const GREENHOUSE_URL = (board) =>
  `https://boards-api.greenhouse.io/v1/boards/${board}/jobs`;
const ASHBY_URL = (board) =>
  `https://api.ashbyhq.com/posting-api/job-board/${board}`;
const LEVER_URL = (board) => `https://api.lever.co/v0/postings/${board}?mode=json`;

/**
 * @param {JobSource} src
 * @returns {Promise<import('./jobs.js').Job[]>}
 */
export async function fetchJobsForSource(src) {
  try {
    if (src.ats === "greenhouse") {
      const res = await fetch(GREENHOUSE_URL(src.board));
      if (!res.ok) return [];
      const data = await res.json();
      return (data.jobs || [])
        .map((j) => normalizeGreenhouseJob(src, j))
        .filter(Boolean);
    }
    if (src.ats === "ashby") {
      const res = await fetch(ASHBY_URL(src.board));
      if (!res.ok) return [];
      const data = await res.json();
      return (data.jobs || [])
        .map((j) => normalizeAshbyJob(src, j))
        .filter(Boolean);
    }
    if (src.ats === "lever") {
      const res = await fetch(LEVER_URL(src.board));
      if (!res.ok) return [];
      const data = await res.json();
      if (!Array.isArray(data)) return [];
      return data.map((j) => normalizeLeverJob(src, j)).filter(Boolean);
    }
  } catch {
    return [];
  }
  return [];
}

/**
 * @param {JobSource[]} sources
 */
export async function fetchLiveJobs(sources) {
  const batches = await Promise.allSettled(
    sources.map((src) => fetchJobsForSource(src)),
  );
  const jobs = [];
  for (const batch of batches) {
    if (batch.status === "fulfilled") jobs.push(...batch.value);
  }
  return dedupeJobs(jobs);
}

/**
 * @param {import('./jobs.js').Job[]} jobs
 */
export function dedupeJobs(jobs) {
  const byKey = new Map();
  for (const job of jobs) {
    const key = normalizeKey(job.company, job.role, job.location);
    const existing = byKey.get(key);
    const pri = SOURCE_PRIORITY[job.source] ?? 0;
    const existingPri = existing ? (SOURCE_PRIORITY[existing.source] ?? 0) : -1;
    if (!existing || pri > existingPri) {
      byKey.set(key, job);
    }
  }
  return [...byKey.values()];
}

/**
 * @param {import('./jobs.js').Job[]} fallback
 * @param {import('./jobs.js').Job[]} live
 */
export function mergeJobs(fallback, live) {
  if (!live.length) return sortJobs(fallback);
  const merged = dedupeJobs([...fallback, ...live]);
  return sortJobs(merged);
}

/**
 * @param {import('./jobs.js').Job[]} jobs
 */
export function sortJobs(jobs) {
  return [...jobs].sort((a, b) => a.postedDays - b.postedDays);
}

export function getAreas(jobs) {
  return [...new Set(jobs.map((j) => j.area))].sort();
}

export function getCompanies(jobs) {
  return [...new Set(jobs.map((j) => j.company))].sort();
}

/** Role/function labels incorrectly used as company industry. */
const INVALID_COMPANY_AREAS = new Set(["Design", ""]);

const COMPANY_KEY_ALIASES = {
  anysphere: "cursor",
  "scale ai": "scale ai",
  scaleai: "scale ai",
  "character ai": "character ai",
  character: "character ai",
  "weights and biases": "weights & biases",
  wandb: "weights & biases",
  "mistral ai": "mistral ai",
  mistral: "mistral ai",
  "together ai": "together ai",
  together: "together ai",
  "luma ai": "luma ai",
  lumaai: "luma ai",
  "eleven labs": "elevenlabs",
  "the browser company": "arc",
  browser: "arc",
};

const INDUSTRY_HEURISTICS = [
  { area: "Fintech", pattern: /\b(bank|banks|pay|payment|finance|financial|capital|credit|lend|lending|wallet|trading|crypto|defi|insur|fintech|mortgage|brokerage)\b/i },
  { area: "Healthtech", pattern: /\b(health|healthcare|medical|clinic|pharma|therap|wellness|patient|care|biotech|life science|genomics|benchling)\b/i },
  { area: "AI Research", pattern: /\b(ai|artificial intelligence|ml|machine learning|llm|openai|anthropic|deepmind|research lab)\b/i },
  { area: "Developer Tools", pattern: /\b(developer|devtools|dev tools|infrastructure|infra|cloud|saas platform|api platform)\b/i },
  { area: "Design Tools", pattern: /\b(design tool|figma|creative suite|ux platform)\b/i },
  { area: "Productivity", pattern: /\b(productivity|workspace|docs|document|notion|collaboration)\b/i },
  { area: "Enterprise AI", pattern: /\b(enterprise|b2b|workflow automation|sales platform|crm)\b/i },
  { area: "Consumer App", pattern: /\b(consumer|social|dating|gaming|media|streaming|marketplace|ecommerce|e-commerce|retail)\b/i },
  { area: "Legal AI", pattern: /\b(legal|law|compliance|contract)\b/i },
  { area: "Generative AI", pattern: /\b(generative|gen ai|image gen|video gen|voice ai)\b/i },
];

/**
 * @param {string} company
 */
export function normalizeCompanyName(company) {
  return (company || "").replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * @param {string} company
 */
export function normalizeCompanyKey(company) {
  return normalizeCompanyName(company).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * @param {import('./jobs.js').JobSource[]} sources
 * @param {import('./jobs.js').Job[]} [jobs]
 */
export function buildCompanyAreaLookup(sources, jobs = []) {
  const lookup = new Map();

  for (const src of sources) {
    lookup.set(normalizeCompanyKey(src.company), src.area);
    const brand = src.domain?.split(".")[0];
    if (brand) lookup.set(normalizeCompanyKey(brand), src.area);
  }

  for (const job of jobs) {
    if (!job.area || INVALID_COMPANY_AREAS.has(job.area)) continue;
    if (job.source === "builtin") continue;
    const key = normalizeCompanyKey(job.company);
    if (!lookup.has(key)) lookup.set(key, job.area);
  }

  for (const [alias, canonical] of Object.entries(COMPANY_KEY_ALIASES)) {
    const canonicalArea = lookup.get(canonical);
    if (canonicalArea) lookup.set(alias, canonicalArea);
  }

  return lookup;
}

/**
 * @param {string} company
 */
export function inferCompanyAreaFromHeuristics(company) {
  const text = normalizeCompanyName(company);
  for (const { area, pattern } of INDUSTRY_HEURISTICS) {
    if (pattern.test(text)) return area;
  }
  return "Other";
}

/**
 * @param {string} company
 * @param {Map<string, string>} lookup
 */
export function resolveCompanyArea(company, lookup) {
  const key = normalizeCompanyKey(company);
  const aliasKey = COMPANY_KEY_ALIASES[key];
  if (aliasKey && lookup.has(aliasKey)) return lookup.get(aliasKey);
  if (lookup.has(key)) return lookup.get(key);

  for (const [knownKey, area] of lookup) {
    if (key.includes(knownKey) || knownKey.includes(key)) return area;
  }

  return inferCompanyAreaFromHeuristics(company);
}

/**
 * @param {import('./jobs.js').Job[]} jobs
 * @param {import('./jobs.js').JobSource[]} sources
 */
export function applyCompanyAreas(jobs, sources) {
  const lookup = buildCompanyAreaLookup(sources, jobs);
  return jobs.map((job) => ({
    ...job,
    area: resolveCompanyArea(job.company, lookup),
  }));
}

const LOCATION_SYNONYMS = {
  ca: ["california"],
  california: ["ca"],
  sf: ["san", "francisco"],
  usa: ["us", "united", "states"],
  us: ["usa", "united", "states"],
};

const LOCATION_NOISE_TOKENS = new Set(["usa", "us", "united", "states"]);

/**
 * @param {string} value
 */
export function normalizeLocationText(value) {
  return (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * @param {string} value
 */
export function buildLocationMatchText(value) {
  const normalized = normalizeLocationText(value);
  if (!normalized) return "";
  const tokens = normalized.split(" ").filter(Boolean);
  const expanded = new Set();
  for (const token of tokens) {
    if (!LOCATION_NOISE_TOKENS.has(token)) expanded.add(token);
    const aliases = LOCATION_SYNONYMS[token] || [];
    for (const alias of aliases) {
      if (!LOCATION_NOISE_TOKENS.has(alias)) expanded.add(alias);
    }
  }
  return [...expanded].join(" ");
}

/**
 * @param {string} candidate
 * @param {string} selected
 */
export function locationMatches(candidate, selected) {
  if (!selected) return true;
  const candidateText = buildLocationMatchText(candidate);
  const selectedText = buildLocationMatchText(selected);
  if (!candidateText || !selectedText) return false;
  const candidateTokens = new Set(candidateText.split(" ").filter(Boolean));
  const selectedTokens = selectedText.split(" ").filter(Boolean);
  return selectedTokens.every((token) => candidateTokens.has(token));
}

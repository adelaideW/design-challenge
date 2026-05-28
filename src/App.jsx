import { useState, useRef, useEffect, useMemo } from "react";
import { useJobs } from "./hooks/useJobs.js";
import { getInterviewReply, INTERVIEW_SYSTEM_PROMPT } from "./lib/interviewApi.js";
import { locationMatches } from "./lib/jobs.js";

// ─── MOCK INTERVIEW ──────────────────────────────────────────────────────────

const ASCII_CHARS = "01<>{}[]|\\/-+*=~^%$#@!?";
function buildAsciiGrid(cols, rows) {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () =>
      ASCII_CHARS[Math.floor(Math.random() * ASCII_CHARS.length)]
    ).join(" ")
  ).join("\n");
}
const ASCII_GRID = buildAsciiGrid(52, 18);


// ─── SHARED STYLES ───────────────────────────────────────────────────────────

const GLOBAL_CSS = `
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; padding: 0; text-align: left; }
  #root { text-align: left; }

  .sticky-header {
    position: sticky; top: 0; z-index: 300; background: #fff;
    transition: box-shadow 0.2s ease;
  }
  .sticky-header.scrolled { box-shadow: 0 2px 8px rgba(0,0,0,0.06); }

  .ascii-hero {
    overflow: hidden; background: #fff;
    padding: 44px 48px 40px; border-bottom: 1px solid #e8e8e8; text-align: left; width: 100%;
    transition: padding 0.25s ease;
  }
  .ascii-hero.compact {
    padding: 14px 48px 12px;
    background: #fff;
  }
  .ascii-hero.compact .hero-title { font-size: 18px; font-weight: 500; margin-bottom: 0; letter-spacing: -0.2px; transition: font-size 0.25s ease; }
  .ascii-hero.compact .hero-subtitle { display: none; }
  .ascii-hero.compact .hero-label { display: none; }
  .ascii-bg {
    position: absolute; inset: 0;
    font-family: 'Courier New', monospace; font-size: 11px;
    line-height: 1.55; letter-spacing: 1px;
    color: rgba(0,0,0,0.07); white-space: pre;
    padding: 12px 16px; pointer-events: none; overflow: hidden; user-select: none;
  }
  .hero-content { position: relative; z-index: 1; }
  .hero-label {
    font-family: 'Courier New', monospace; font-size: 11px;
    letter-spacing: 3px; text-transform: uppercase; color: #888; margin-bottom: 14px;
  }
  .hero-title {
    font-size: clamp(28px, 4vw, 46px); font-weight: 400; line-height: 1.15;
    letter-spacing: -0.5px; color: #111; margin: 0 0 14px;
  }
  .hero-subtitle {
    font-size: 15px; color: #666; line-height: 1.6; margin: 0; max-width: 460px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }

  /* Tabs */
  .tab-bar {
    display: flex; border-bottom: 1px solid #e8e8e8;
    background: #fff; padding: 0 48px; gap: 0;
  }
  .tab-btn {
    font-family: 'Courier New', monospace; font-size: 11px; letter-spacing: 2px;
    text-transform: uppercase; color: #999; background: none; border: none;
    padding: 14px 0; margin-right: 32px; cursor: pointer;
    border-bottom: 2px solid transparent; transition: all 0.15s;
  }
  .tab-btn:hover { color: #333; }
  .tab-btn.active { color: #111; border-bottom-color: #111; }

  /* Main content */
  .main-content { padding: 0 48px 80px; text-align: left; width: 100%; }

  /* Interview */
  .tips-row { display: flex; gap: 8px; flex-wrap: wrap; margin: 40px 0 36px; }
  .tip-chip {
    font-family: 'Courier New', monospace; font-size: 11px; letter-spacing: 0.5px;
    color: #888; background: #fff; border: 1px solid #ddd; border-radius: 20px; padding: 6px 14px;
  }
  .start-btn {
    display: inline-block; background: #111; color: #fff; border: none;
    padding: 13px 32px; font-size: 12px; font-family: 'Courier New', monospace;
    letter-spacing: 2px; text-transform: uppercase; cursor: pointer; border-radius: 8px; transition: background 0.2s;
  }
  .start-btn:hover { background: #333; }

  .chat-area { padding-top: 36px; display: flex; flex-direction: column; }
  .message-row { display: flex; flex-direction: column; padding: 22px 0; border-bottom: 1px solid #eee; }
  .message-row:first-child { border-top: 1px solid #eee; }
  .msg-label {
    font-family: 'Courier New', monospace; font-size: 10px; letter-spacing: 2px;
    text-transform: uppercase; margin-bottom: 10px;
  }
  .msg-label.interviewer { color: #111; }
  .msg-label.you { color: #999; }
  .msg-body {
    font-size: 15px; line-height: 1.8; color: #222; white-space: pre-wrap;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; width: 100%;
  }
  .msg-body.you { color: #555; }

  .typing-row { display: flex; flex-direction: column; padding: 22px 0; border-bottom: 1px solid #eee; }
  .typing-dots { display: flex; gap: 5px; align-items: center; margin-top: 4px; }
  .dot { width: 5px; height: 5px; border-radius: 50%; background: #bbb; animation: blink 1.2s infinite; }
  .dot:nth-child(2) { animation-delay: 0.2s; }
  .dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes blink {
    0%, 100% { opacity: 0.3; transform: scale(0.8); }
    50% { opacity: 1; transform: scale(1.1); }
  }

  .input-wrap {
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 200;
    background: #fff; border-top: 1px solid #eee;
    padding: 18px 48px 22px;
  }
  /* Space so last message isn't hidden behind fixed input */
  .chat-area { padding-bottom: 120px; }
  .input-inner { display: flex; gap: 12px; align-items: flex-end; }
  textarea.chat-input {
    flex: 1; border: 1px solid #ddd; border-radius: 8px;
    padding: 12px 16px; font-size: 14px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    line-height: 1.6; background: #fff; color: #222; resize: none; outline: none;
    overflow-y: auto; transition: border-color 0.15s; min-height: 46px; max-height: 800px;
  }
  textarea.chat-input:focus { border-color: #111; }
  textarea.chat-input::placeholder { color: #bbb; }
  .send-btn {
    background: #111; color: #fff; border: none; border-radius: 8px;
    padding: 10px 20px; font-size: 12px; font-family: 'Courier New', monospace;
    letter-spacing: 1px; cursor: pointer; white-space: nowrap; transition: background 0.15s;
  }
  .send-btn:hover:not(:disabled) { background: #333; }
  .send-btn:disabled { background: #eee; color: #bbb; cursor: default; }
  .input-hint { font-family: 'Courier New', monospace; font-size: 10px; color: #ccc; margin-top: 8px; }

  .done-section { padding: 48px 0 32px; }
  .done-label { font-family: 'Courier New', monospace; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #999; margin-bottom: 24px; }
  .restart-btn {
    background: transparent; color: #111; border: 1px solid #111;
    padding: 11px 28px; font-size: 12px; font-family: 'Courier New', monospace;
    letter-spacing: 2px; text-transform: uppercase; cursor: pointer; border-radius: 2px; transition: all 0.15s;
  }
  .restart-btn:hover { background: #111; color: #fff; }

  /* ── Jobs Tab ── */
  .jobs-controls {
    display: flex; gap: 12px; align-items: center;
    flex-wrap: wrap;
    background: #fff; border-bottom: 1px solid #eee;
    margin: 0; padding: 14px 48px;
  }
  .search-box {
    border: 1px solid #ddd; border-radius: 8px; padding: 9px 14px;
    font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: #222; background: #fff; outline: none; width: 240px; transition: border-color 0.15s;
  }
  .search-box:focus { border-color: #111; }
  .search-box::placeholder { color: #bbb; }
  .filter-select {
    border: 1px solid #ddd; border-radius: 8px; padding: 9px 30px 9px 12px;
    font-size: 12px; font-family: 'Courier New', monospace; letter-spacing: 0.5px;
    color: #555; background: #fff; outline: none; appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23999'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 10px center;
    cursor: pointer; transition: border-color 0.15s;
  }
  .filter-select:focus { border-color: #111; }
  .clear-btn {
    font-family: 'Courier New', monospace; font-size: 10px; letter-spacing: 1px;
    text-transform: uppercase; color: #999; background: none; border: none;
    cursor: pointer; padding: 0; transition: color 0.15s;
  }
  .clear-btn:hover { color: #111; }
  .jobs-count {
    margin-left: auto; font-family: 'Courier New', monospace;
    font-size: 10px; letter-spacing: 1px; color: #777; text-transform: uppercase;
  }

  .jobs-table { width: 100%; border-collapse: collapse; margin-top: 4px; table-layout: fixed; }
  .jobs-table col.col-company { width: 20%; }
  .jobs-table col.col-role { width: 28%; }
  .jobs-table col.col-area { width: 14%; }
  .jobs-table col.col-location { width: 20%; }
  .jobs-table col.col-posted { width: 10%; }
  .jobs-table col.col-apply { width: 8%; }
  .jobs-table th {
    font-family: 'Courier New', monospace; font-size: 10px; letter-spacing: 2px;
    text-transform: uppercase; color: #555; font-weight: 400;
    padding: 12px 16px 12px 0; border-bottom: 1px solid #111; text-align: left;
    position: sticky; top: var(--sticky-h, 0px); background: #fff; z-index: 50;
  }
  .jobs-table th:last-child { text-align: right; padding-right: 0; }
  .jobs-table td {
    padding: 14px 16px 14px 0; border-bottom: 1px solid #eee;
    font-size: 13px; vertical-align: middle;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #222;
    height: 58px;
  }
  .jobs-table td:last-child { text-align: right; padding-right: 0; }
  .jobs-table tr:hover td { background: #fafafa; }
  .jobs-cell-center { vertical-align: middle; }
  .jobs-cell-right { text-align: right; }

  .jobs-cell-clamp {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.35;
    max-height: calc(1.35em * 2);
    word-break: break-word;
  }
  .company-cell {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: calc(1.35em * 2);
  }
  .company-cell .company-name.jobs-cell-clamp {
    white-space: normal;
  }
  .company-logo { width: 20px; height: 20px; border-radius: 4px; object-fit: contain; border: 1px solid #eee; flex-shrink: 0; }
  .company-name {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px;
    color: #222; cursor: pointer; border-bottom: 1px solid transparent; transition: border-color 0.15s;
  }
  .company-name:hover { border-bottom-color: #111; }
  .company-name.filtered { border-bottom-color: #111; font-weight: bold; }
  .location-text {
    color: #666;
    cursor: pointer;
    border-bottom: 1px solid transparent;
    transition: border-color 0.15s;
  }
  .location-text.filtered {
    border-bottom-color: #111;
    font-weight: 600;
    color: #333;
  }

  .area-badge {
    display: inline-block; font-family: 'Courier New', monospace; font-size: 10px;
    letter-spacing: 0.5px; color: #444; background: #f4f4f4;
    border-radius: 20px; padding: 3px 10px; white-space: nowrap;
    height: 22px;
    line-height: 16px;
  }
  .area-badge.filtered {
    background: #111;
    color: #fff;
  }
  .posted-text { font-size: 12px; color: #666; white-space: nowrap; }
  .apply-link {
    font-family: 'Courier New', monospace; font-size: 11px; letter-spacing: 1px;
    color: #111; text-decoration: none; border-bottom: 1px solid #ddd; transition: border-color 0.15s;
  }
  .apply-link:hover { border-bottom-color: #111; }

  .no-results {
    padding: 56px 0; font-family: 'Courier New', monospace;
    font-size: 12px; letter-spacing: 1px; color: #bbb; text-transform: uppercase;
  }
`;

// ─── JOBS CONTROLS ───────────────────────────────────────────────────────────

function formatSyncTime(date) {
  if (!date) return null;
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function JobsControls({
  search, setSearch, areaFilter, setAreaFilter, companyFilter, setCompanyFilter,
  locationFilter, setLocationFilter, count, totalCount, areas, companies, locations, loading, lastSyncedAt, syncError,
}) {
  const hasFilters = search || areaFilter || companyFilter || locationFilter;
  const syncLabel = loading
    ? "Refreshing listings…"
    : lastSyncedAt
      ? `Updated ${formatSyncTime(lastSyncedAt)}`
      : "Showing cached listings";

  return (
    <div className="jobs-controls">
      <input
        className="search-box"
        placeholder="Search role, company, location…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      <select className="filter-select" value={areaFilter} onChange={e => setAreaFilter(e.target.value)}>
        <option value="">All areas</option>
        {areas.map(a => <option key={a} value={a}>{a}</option>)}
      </select>
      <select className="filter-select" value={companyFilter} onChange={e => setCompanyFilter(e.target.value)}>
        <option value="">All companies</option>
        {companies.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <select className="filter-select" value={locationFilter} onChange={e => setLocationFilter(e.target.value)}>
        <option value="">All locations</option>
        {locations.map(l => <option key={l} value={l}>{l}</option>)}
      </select>
      {hasFilters && (
        <button className="clear-btn" onClick={() => { setSearch(""); setAreaFilter(""); setCompanyFilter(""); setLocationFilter(""); }}>
          Clear ×
        </button>
      )}
      <span className="jobs-count">
        {count} shown · {totalCount || count} total
      </span>
      <span style={{ fontFamily: "'Courier New', monospace", fontSize: 10, color: "#888", letterSpacing: "0.5px" }}>
        {syncLabel}
        {syncError && !loading ? " · using cache" : ""}
      </span>
    </div>
  );
}

// ─── JOBS TAB ────────────────────────────────────────────────────────────────

const SORT_KEYS = { Company: "company", Role: "role", Area: "area", Location: "location", Posted: "postedDays" };

function JobsTab({
  jobs,
  formatPosted,
  search,
  areaFilter,
  setAreaFilter,
  companyFilter,
  setCompanyFilter,
  locationFilter,
  setLocationFilter,
  hasMore,
  loadingMore,
  onLoadMore,
}) {
  const [sortCol, setSortCol] = useState("Posted");   // default: sort by Posted (newest first)
  const [sortDir, setSortDir] = useState("asc");
  const sentinelRef = useRef(null);
  const tableTopRef = useRef(null);
  const lastObserverTriggerRef = useRef(0);

  // Multi-keyword search: split on whitespace, every keyword must match
  const keywords = search.toLowerCase().split(/\s+/).filter(Boolean);

  const filtered = jobs.filter(j => {
    const matchSearch = keywords.every(kw =>
      j.role.toLowerCase().includes(kw) ||
      j.company.toLowerCase().includes(kw) ||
      j.area.toLowerCase().includes(kw) ||
      j.location.toLowerCase().includes(kw)
    );
    const matchArea = !areaFilter || j.area === areaFilter;
    const matchCompany = !companyFilter || j.company === companyFilter;
    const matchLocation = locationMatches(j.location, locationFilter);
    return matchSearch && matchArea && matchCompany && matchLocation;
  });

  const sorted = sortCol ? [...filtered].sort((a, b) => {
    const key = SORT_KEYS[sortCol];
    const av = typeof a[key] === "number" ? a[key] : (a[key] || "").toLowerCase();
    const bv = typeof b[key] === "number" ? b[key] : (b[key] || "").toLowerCase();
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  }) : filtered;

  const handleSort = (col) => {
    if (!SORT_KEYS[col]) return; // Apply column not sortable
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const handleCompanyClick = (company) => {
    setCompanyFilter(prev => prev === company ? "" : company);
  };
  const handleAreaClick = (area) => {
    setAreaFilter(prev => prev === area ? "" : area);
  };
  const handleLocationClick = (location) => {
    setLocationFilter((prev) => (prev && locationMatches(location, prev) && locationMatches(prev, location) ? "" : location));
  };

  const SortIcon = ({ col }) => {
    if (!SORT_KEYS[col]) return null;
    if (sortCol !== col) return <span style={{ color: "#ccc", marginLeft: 4, fontSize: 9 }}>↕</span>;
    return <span style={{ color: "#111", marginLeft: 4, fontSize: 9 }}>{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  useEffect(() => {
    if (!hasMore || !sentinelRef.current) return;
    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries;
      const now = Date.now();
      const cooldownMs = 300;
      if (
        entry.isIntersecting &&
        !loadingMore &&
        now - lastObserverTriggerRef.current > cooldownMs
      ) {
        lastObserverTriggerRef.current = now;
        onLoadMore();
      }
    }, { rootMargin: "300px 0px" });
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, onLoadMore]);

  return (
    <div className="main-content">
      {sorted.length === 0 ? (
        <div className="no-results">No roles found</div>
      ) : (
        <>
          <div ref={tableTopRef} />
          <table className="jobs-table">
            <colgroup>
              <col className="col-company" />
              <col className="col-role" />
              <col className="col-area" />
              <col className="col-location" />
              <col className="col-posted" />
              <col className="col-apply" />
            </colgroup>
            <thead>
              <tr>
                {["Company", "Role", "Area", "Location", "Posted", "Apply"].map(col => (
                  <th
                    key={col}
                    onClick={() => handleSort(col)}
                    style={{ cursor: SORT_KEYS[col] ? "pointer" : "default", userSelect: "none", whiteSpace: "nowrap" }}
                  >
                    {col}<SortIcon col={col} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(job => (
                <tr key={job.id}>
                  <td>
                    <div className="company-cell">
                      <img className="company-logo" src={job.logo} alt={job.company} onError={e => { e.target.style.display = "none"; }} />
                      <span
                        className={`company-name jobs-cell-clamp ${companyFilter === job.company ? "filtered" : ""}`}
                        onClick={() => handleCompanyClick(job.company)}
                        title={companyFilter === job.company ? "Click to clear filter" : `Filter by ${job.company}`}
                      >
                        {job.company}
                      </span>
                    </div>
                  </td>
                  <td><div className="jobs-cell-clamp">{job.role}</div></td>
                  <td className="jobs-cell-center">
                    <button
                      type="button"
                      className={`area-badge ${areaFilter === job.area ? "filtered" : ""}`}
                      onClick={() => handleAreaClick(job.area)}
                      style={{ border: 0, cursor: "pointer" }}
                      title={areaFilter === job.area ? "Clear area filter" : `Filter by ${job.area}`}
                    >
                      {job.area}
                    </button>
                  </td>
                  <td>
                    <div
                      className={`jobs-cell-clamp location-text ${locationFilter && locationMatches(job.location, locationFilter) ? "filtered" : ""}`}
                      onClick={() => handleLocationClick(job.location)}
                      title={locationFilter && locationMatches(job.location, locationFilter) ? "Clear location filter" : `Filter by ${job.location}`}
                    >
                      {job.location}
                    </div>
                  </td>
                  <td className="jobs-cell-center"><span className="posted-text">{formatPosted(job.postedDays)}</span></td>
                  <td className="jobs-cell-right jobs-cell-center">
                    <a className="apply-link" href={job.url} target="_blank" rel="noopener noreferrer">Apply ↗</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {hasMore && (
            <div ref={sentinelRef} style={{ padding: "14px 0", textAlign: "center" }}>
              <span className="posted-text">
                {loadingMore ? "Loading more roles…" : "Scroll to load more"}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── INTERVIEW TAB ────────────────────────────────────────────────────────────

function InterviewTab() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [apiError, setApiError] = useState("");
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 800) + "px";
  };

  const requestAssistantReply = async (conversation) => {
    setLoading(true);
    setApiError("");
    try {
      const assistantText = await getInterviewReply(conversation);
      setMessages(prev => [...prev, { role: "assistant", content: assistantText }]);
    } catch (err) {
      setApiError(err?.message || "Could not reach interview API.");
    } finally {
      setLoading(false);
    }
  };

  const startSession = async () => {
    setStarted(true);
    await requestAssistantReply([
      { role: "system", content: INTERVIEW_SYSTEM_PROMPT },
      { role: "user", content: "Start the mock interview now with one realistic design challenge." },
    ]);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    await requestAssistantReply([
      { role: "system", content: INTERVIEW_SYSTEM_PROMPT },
      ...newMessages,
    ]);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const restart = () => {
    setMessages([]); setInput(""); setStarted(false);
    setApiError("");
  };

  return (
    <div className="main-content">
      {!started ? (
        <>
          <div className="tips-row">
            {["Clarify before jumping in", "Narrate your thinking", "Connect design to outcomes"].map(tip => (
              <span key={tip} className="tip-chip">{tip}</span>
            ))}
          </div>
          <button className="start-btn" onClick={startSession}>Begin Session</button>
        </>
      ) : (
        <>
          <div className="chat-area">
            {messages.map((msg, i) => (
              <div key={i} className="message-row">
                <div className={`msg-label ${msg.role === "user" ? "you" : "interviewer"}`}>
                  {msg.role === "user" ? "You" : "Interviewer"}
                </div>
                <div className={`msg-body ${msg.role === "user" ? "you" : ""}`}>{msg.content}</div>
              </div>
            ))}
            {loading && (
              <div className="typing-row">
                <div className="msg-label interviewer">Interviewer</div>
                <div className="typing-dots"><span className="dot"/><span className="dot"/><span className="dot"/></div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="input-wrap">
            <div className="input-inner">
              <textarea
                ref={textareaRef}
                className="chat-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                onInput={handleInput}
                onKeyDown={handleKey}
                placeholder="Ask a clarifying question, share your thinking, or present your approach…"
                rows={1}
              />
              <button className="send-btn" onClick={sendMessage} disabled={!input.trim() || loading}>Send ↑</button>
              <button
                className="restart-btn"
                onClick={restart}
                style={{ padding: "10px 20px", borderRadius: 8, marginLeft: 6 }}
              >
                Restart
              </button>
            </div>
            <div className="input-hint">
              Enter to send · Shift+Enter for new line
              {apiError ? ` · ${apiError}` : ""}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────

const HERO_CONTENT = {
  interview: {
    label: "Mock Interview · Live Design Challenge",
    title: <>Practice your<br />design thinking.</>,
    subtitle: "A real design prompt, live pushback, and honest feedback — just like the actual interview.",
  },
  jobs: {
    label: "Role Hunter · Design Jobs",
    title: <>Hunt your next<br />design role.</>,
    subtitle: "Verified listings from company career pages, refreshed live when you open the app.",
  },
};

export default function App() {
  const [tab, setTab] = useState("jobs");
  const [scrolled, setScrolled] = useState(false);
  const [search, setSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const stickyRef = useRef(null);
  const scrolledRef = useRef(false);
  const hero = HERO_CONTENT[tab];
  const {
    jobs,
    loading,
    loadingMore,
    lastSyncedAt,
    totalCount,
    hasMore,
    error: syncError,
    areas,
    companies,
    loadMore,
    formatPosted,
  } = useJobs();

  const filteredCount = useMemo(() => {
    const kws = search.toLowerCase().split(/\s+/).filter(Boolean);
    return jobs.filter(j =>
      kws.every(kw =>
        j.role.toLowerCase().includes(kw) ||
        j.company.toLowerCase().includes(kw) ||
        j.area.toLowerCase().includes(kw) ||
        j.location.toLowerCase().includes(kw)
      ) &&
      (!areaFilter || j.area === areaFilter) &&
      (!companyFilter || j.company === companyFilter) &&
      locationMatches(j.location, locationFilter)
    ).length;
  }, [jobs, search, areaFilter, companyFilter, locationFilter]);

  const locations = useMemo(
    () => [...new Set(jobs.map((j) => j.location).filter(Boolean))].sort(),
    [jobs],
  );

  useEffect(() => {
    const compactOnAt = 56;
    const compactOffAt = 24;
    const onScroll = () => {
      const y = window.scrollY;
      const nextScrolled = scrolledRef.current
        ? y > compactOffAt
        : y > compactOnAt;
      if (nextScrolled !== scrolledRef.current) {
        scrolledRef.current = nextScrolled;
        setScrolled(nextScrolled);
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Keep --sticky-h in sync with the sticky wrapper's real height
  useEffect(() => {
    const el = stickyRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      document.documentElement.style.setProperty("--sticky-h", el.offsetHeight + "px");
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: "'Georgia', serif", color: "#1a1a1a" }}>
      <style>{GLOBAL_CSS}</style>

      {/* Sticky header wrapper: hero + tabs + (jobs controls) */}
      <div ref={stickyRef} className={`sticky-header${scrolled ? " scrolled" : ""}`}>
        {/* Hero */}
        <div className={`ascii-hero${scrolled ? " compact" : ""}`}>
          {tab === "interview" && <div className="ascii-bg">{ASCII_GRID}</div>}
          <div className="hero-content">
            <div className="hero-label">{hero.label}</div>
            <h1 className="hero-title">{hero.title}</h1>
            <p className="hero-subtitle">{hero.subtitle}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="tab-bar">
          <button className={`tab-btn ${tab === "jobs" ? "active" : ""}`} onClick={() => setTab("jobs")}>
            Design Jobs
          </button>
          <button className={`tab-btn ${tab === "interview" ? "active" : ""}`} onClick={() => setTab("interview")}>
            Mock Interview
          </button>
        </div>

        {/* Jobs controls live in the sticky band */}
        {tab === "jobs" && (
          <JobsControls
            search={search} setSearch={setSearch}
            areaFilter={areaFilter} setAreaFilter={setAreaFilter}
            companyFilter={companyFilter} setCompanyFilter={setCompanyFilter}
            locationFilter={locationFilter} setLocationFilter={setLocationFilter}
            count={filteredCount}
            totalCount={totalCount}
            areas={areas}
            companies={companies}
            locations={locations}
            loading={loading}
            lastSyncedAt={lastSyncedAt}
            syncError={syncError}
          />
        )}
      </div>

      {/* Content */}
      {tab === "jobs"
        ? (
          <JobsTab
            jobs={jobs}
            formatPosted={formatPosted}
            search={search}
            areaFilter={areaFilter}
            setAreaFilter={setAreaFilter}
            companyFilter={companyFilter}
            setCompanyFilter={setCompanyFilter}
            locationFilter={locationFilter}
            setLocationFilter={setLocationFilter}
            hasMore={hasMore}
            loadingMore={loadingMore}
            onLoadMore={loadMore}
          />
        )
        : <InterviewTab />}
    </div>
  );
}

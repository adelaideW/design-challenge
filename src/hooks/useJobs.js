import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  formatPosted,
  getAreas,
  getCompanies,
  sortJobs,
} from "../lib/jobs.js";

export function useJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const loadingPageRef = useRef(false);
  const nextPageRef = useRef(1);
  const pageCountRef = useRef(1);
  const hasMoreRef = useRef(true);

  const loadPage = useCallback(async (pageNumber) => {
    if (loadingPageRef.current) return [];
    loadingPageRef.current = true;
    try {
      const res = await fetch(`/data/jobs/page-${pageNumber}.json`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Could not load page ${pageNumber}`);
      return await res.json();
    } finally {
      loadingPageRef.current = false;
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasMoreRef.current || loadingPageRef.current) return false;
    const pageToLoad = nextPageRef.current;
    setLoadingMore(true);
    setError(null);
    try {
      const pageJobs = await loadPage(pageToLoad);
      setJobs((prev) => sortJobs([...prev, ...pageJobs]));
      const upcoming = pageToLoad + 1;
      const moreAvailable = upcoming <= pageCountRef.current;
      nextPageRef.current = upcoming;
      hasMoreRef.current = moreAvailable;
      setHasMore(moreAvailable);
      return moreAvailable;
    } catch (err) {
      setError(err?.message || "Could not load more jobs");
      return false;
    } finally {
      setLoadingMore(false);
    }
  }, [loadPage]);

  const ensureAllLoaded = useCallback(async (opts = {}) => {
    const { shouldContinue } = opts;
    for (let i = 0; i < 200; i++) {
      if (typeof shouldContinue === "function" && !shouldContinue()) break;
      if (!hasMoreRef.current) break;
      const keepGoing = await loadMore();
      if (!keepGoing) break;
    }
  }, [loadMore]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const metaRes = await fetch("/data/jobs/meta.json", { cache: "no-store" });
        if (!metaRes.ok) throw new Error("Could not load jobs metadata");
        const meta = await metaRes.json();
        if (cancelled) return;
        setTotalCount(meta.totalCount || 0);
        setLastSyncedAt(meta.generatedAt ? new Date(meta.generatedAt) : null);
        pageCountRef.current = meta.pageCount || 1;
        nextPageRef.current = 1;
        hasMoreRef.current = (meta.pageCount || 1) >= 1;
        setHasMore((meta.pageCount || 1) >= 1);
      } catch (err) {
        if (!cancelled) setError(err?.message || "Could not load jobs metadata");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!loading && jobs.length === 0 && hasMoreRef.current && nextPageRef.current === 1) {
      void loadMore();
    }
  }, [jobs.length, loadMore, loading]);

  const areas = useMemo(() => getAreas(jobs), [jobs]);
  const companies = useMemo(() => getCompanies(jobs), [jobs]);

  return {
    jobs,
    loading,
    loadingMore,
    lastSyncedAt,
    totalCount,
    hasMore,
    error,
    areas,
    companies,
    loadMore,
    ensureAllLoaded,
    formatPosted,
  };
}

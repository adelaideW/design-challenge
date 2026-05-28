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
  const [pageCount, setPageCount] = useState(1);
  const [nextPage, setNextPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const loadingPageRef = useRef(false);

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
    if (!hasMore || loadingPageRef.current) return false;
    setLoadingMore(true);
    setError(null);
    try {
      const pageJobs = await loadPage(nextPage);
      setJobs((prev) => sortJobs([...prev, ...pageJobs]));
      const upcoming = nextPage + 1;
      const moreAvailable = upcoming <= pageCount;
      setNextPage(upcoming);
      setHasMore(moreAvailable);
      return moreAvailable;
    } catch (err) {
      setError(err?.message || "Could not load more jobs");
      return false;
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadPage, nextPage, pageCount]);

  const ensureAllLoaded = useCallback(async () => {
    for (let i = 0; i < 100; i++) {
      // eslint-disable-next-line no-await-in-loop
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
        setPageCount(meta.pageCount || 1);
        setLastSyncedAt(meta.generatedAt ? new Date(meta.generatedAt) : null);
        setNextPage(1);
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
    if (!loading && jobs.length === 0 && hasMore && nextPage === 1) {
      void loadMore();
    }
  }, [hasMore, jobs.length, loadMore, loading, nextPage]);

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

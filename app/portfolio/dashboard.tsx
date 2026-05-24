"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  DashboardView,
  type DecisionRow,
} from "./dashboard-view";
import type { Goal, TargetWeights } from "@/lib/types";
import type { TokenBalances } from "@/lib/arc/balances";

type Props = {
  address: `0x${string}`;
  goal: Goal;
  email: string | null;
  lastCheckedAt: string | null;
};

type PortfolioResponse = {
  address: string;
  walletId: string | null;
  goal: Goal;
  balances: TokenBalances;
};

type TraceResponse = {
  decisions: DecisionRow[];
  hasMore: boolean;
};

const POLL_MS_ACTIVE = 10_000;
const POLL_MS_IDLE = 30_000;
const IDLE_THRESHOLD = 5; // after N idle polls, slow down
const PAGE_SIZE = 10;

export function Dashboard({ address, goal, email, lastCheckedAt }: Props) {
  const [balances, setBalances] = useState<TokenBalances | null>(null);
  const [decisions, setDecisions] = useState<DecisionRow[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [lastChecked, setLastChecked] = useState<string | null>(lastCheckedAt);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [running, setRunning] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Idle counter: increments each time a poll returns identical balances.
  // Used to dial back polling cadence when nothing's changing.
  const idleCountRef = useRef(0);
  const lastSnapshotRef = useRef<string>("");

  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const [p, t] = await Promise.all([
          fetch("/api/portfolio", { cache: "no-store", signal }),
          fetch(`/api/trace?pageSize=${PAGE_SIZE}&page=1`, { cache: "no-store", signal }),
        ]);
        if (!p.ok) {
          const body = await p.json().catch(() => null);
          throw new Error(body?.details || body?.error || `HTTP ${p.status}`);
        }
        const pj = (await p.json()) as PortfolioResponse & { lastCheckedAt?: string };
        setBalances(pj.balances);
        if (pj.lastCheckedAt) setLastChecked(pj.lastCheckedAt);

        if (t.ok) {
          const tj = (await t.json()) as TraceResponse;
          setDecisions(tj.decisions ?? []);
          setHasMore(tj.hasMore ?? false);
          setPage(1);
        }

        // Idle detection — same balance total + same decision count = idle.
        const snapshot = `${pj.balances.total.toFixed(6)}|${decisions[0]?.id ?? ""}`;
        if (snapshot === lastSnapshotRef.current) {
          idleCountRef.current += 1;
        } else {
          idleCountRef.current = 0;
          lastSnapshotRef.current = snapshot;
        }

        setError(null);
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    // Intentionally only re-create when address changes — decisions[0]?.id is
    // read inside via the closure but doesn't need to drive a re-subscribe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [address],
  );

  // Initial fetch + smart polling loop with AbortController on unmount.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const ctrl = new AbortController();

    const tick = async () => {
      if (cancelled) return;
      // Pause entirely if the tab is hidden.
      if (typeof document !== "undefined" && document.hidden) {
        timer = setTimeout(tick, POLL_MS_ACTIVE);
        return;
      }
      await refresh(ctrl.signal);
      if (cancelled) return;
      const interval =
        idleCountRef.current >= IDLE_THRESHOLD ? POLL_MS_IDLE : POLL_MS_ACTIVE;
      timer = setTimeout(tick, interval);
    };

    tick();

    return () => {
      cancelled = true;
      ctrl.abort();
      if (timer) clearTimeout(timer);
    };
  }, [refresh]);

  async function onRefresh() {
    setRefreshing(true);
    idleCountRef.current = 0; // user actively wants fresh data
    await refresh();
  }

  async function onRunAgent() {
    setRunning(true);
    try {
      const res = await fetch("/api/agent/trigger", { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body?.details || body?.error || `HTTP ${res.status}`);
      } else if (body?.result?.skipped) {
        toast.message(`Agent · ${body.result.skipped}`);
      } else {
        toast.success("Agent ran");
      }
      idleCountRef.current = 0;
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }

  async function onInitializeBands() {
    setInitializing(true);
    try {
      const res = await fetch("/api/agent/initialize", { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body?.details || body?.error || `HTTP ${res.status}`);
      } else if (body?.result?.skipped) {
        toast.message(`Init · ${body.result.skipped}`);
      } else {
        toast.success("Bands initialised — refreshing");
      }
      idleCountRef.current = 0;
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setInitializing(false);
    }
  }

  async function onLoadMore() {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await fetch(`/api/trace?pageSize=${PAGE_SIZE}&page=${nextPage}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        toast.error(body?.details || body?.error || `HTTP ${res.status}`);
        return;
      }
      const tj = (await res.json()) as TraceResponse;
      setDecisions((prev) => [...prev, ...(tj.decisions ?? [])]);
      setHasMore(tj.hasMore ?? false);
      setPage(nextPage);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingMore(false);
    }
  }

  async function onCopyAddress() {
    try {
      await navigator.clipboard.writeText(address);
      toast.success("Address copied");
    } catch {
      toast.error("Couldn't copy — long-press the address field instead.");
    }
  }

  // Use a string-keyed targets object so weights are exposed cleanly to
  // dashboard-view. The view itself derives currentWeights from balances.
  const props: Parameters<typeof DashboardView>[0] = {
    address,
    goal,
    email,
    balances,
    decisions,
    lastCheckedAt: lastChecked,
    loading,
    refreshing,
    running,
    initializing,
    loadingMore,
    hasMore,
    error,
    onRefresh,
    onRunAgent,
    onInitializeBands,
    onLoadMore,
    onCopyAddress,
  };

  // Suppress unused warnings — TargetWeights is referenced in the type signature
  void undefined as unknown as TargetWeights;

  return <DashboardView {...props} />;
}

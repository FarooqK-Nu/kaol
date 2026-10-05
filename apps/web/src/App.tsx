import { useEffect, useState, useCallback } from "react";
import type { JobStatus } from "@kaol/shared-types";

interface HealthServices {
  database: "connected" | "disconnected";
  redis: "connected" | "disconnected";
}

interface HealthResponse {
  status: "ok" | "degraded";
  services: HealthServices;
}

export function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [initialStatus] = useState<JobStatus>("queued");

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/health");
      if (!res.ok && res.status !== 503) {
        throw new Error(`HTTP error ${res.status}`);
      }
      const data: HealthResponse = await res.json();
      setHealth(data);
    } catch (err) {
      setError("Backend offline or unreachable");
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const getStatusBadge = (status: "connected" | "disconnected" | "checking") => {
    switch (status) {
      case "connected":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Connected
          </span>
        );
      case "disconnected":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            Disconnected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
            Checking...
          </span>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Arabic to English Subtitles
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          High-accuracy speech recognition, precise alignment, and contextual translation.
        </p>
      </header>

      <main className="space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">System Health (Phase 3)</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                PostgreSQL persistence &amp; Redis queue infrastructure monitoring
              </p>
            </div>
            <button
              onClick={fetchHealth}
              disabled={loading}
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-slate-50 p-4 border border-slate-100">
              <span className="text-xs font-medium uppercase text-slate-500">API Status</span>
              <div className="mt-2">
                {error ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200">
                    Offline
                  </span>
                ) : loading ? (
                  <span className="text-xs text-slate-500">Checking...</span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                    Online ({health?.status || "ok"})
                  </span>
                )}
              </div>
            </div>

            <div className="rounded-lg bg-slate-50 p-4 border border-slate-100">
              <span className="text-xs font-medium uppercase text-slate-500">PostgreSQL (Drizzle)</span>
              <div className="mt-2">
                {loading
                  ? getStatusBadge("checking")
                  : getStatusBadge(health?.services.database || "disconnected")}
              </div>
            </div>

            <div className="rounded-lg bg-slate-50 p-4 border border-slate-100">
              <span className="text-xs font-medium uppercase text-slate-500">Redis Infrastructure</span>
              <div className="mt-2">
                {loading
                  ? getStatusBadge("checking")
                  : getStatusBadge(health?.services.redis || "disconnected")}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Initial Pipeline Stage:{" "}
              <span className="font-mono font-semibold text-emerald-600">{initialStatus}</span>
            </span>
            <span>Canonical States: 10 + terminal</span>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;

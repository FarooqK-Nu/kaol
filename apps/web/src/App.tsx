import { useEffect, useState, useCallback } from "react";
import type { JobStatus } from "@kaol/shared-types";
import { UploadForm } from "./features/upload/UploadForm";
import type { CreateJobResponse } from "./lib/api/jobs";
import { CheckCircle2, Copy, Check, RotateCcw } from "lucide-react";

interface HealthServices {
  database: "connected" | "disconnected";
  redis: "connected" | "disconnected";
}

interface HealthResponse {
  status: "ok" | "degraded";
  services: HealthServices;
}

interface ActiveJobState {
  job: CreateJobResponse;
  fileName: string;
  fileSize: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [initialStatus] = useState<JobStatus>("queued");
  const [activeJob, setActiveJob] = useState<ActiveJobState | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

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
    } catch {
      setError("Backend offline or unreachable");
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const handleJobCreated = (job: CreateJobResponse, file: File) => {
    setActiveJob({
      job,
      fileName: file.name,
      fileSize: file.size,
    });
  };

  const handleCopyJobId = () => {
    if (activeJob) {
      navigator.clipboard.writeText(activeJob.job.jobId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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
    <div className="max-w-4xl mx-auto py-12 px-4 space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Arabic to English Subtitles
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          High-accuracy speech recognition, precise forced alignment, and contextual translation.
        </p>
      </header>

      <main className="space-y-8">
        {/* Phase 5: Media Upload & Job Creation Section */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="pb-4 border-b border-slate-100 mb-6">
            <h2 className="text-lg font-semibold text-slate-800">Media Upload (Phase 5)</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select or drop Arabic audio/video to create an authoritative transcription job
            </p>
          </div>

          {!activeJob ? (
            <UploadForm onJobCreated={handleJobCreated} />
          ) : (
            <div className="space-y-5">
              <div className="rounded-xl bg-emerald-50/70 border border-emerald-200 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-emerald-900">
                        Media Uploaded &amp; Job Queued
                      </h3>
                      <p className="text-xs text-emerald-700 mt-0.5">
                        {activeJob.fileName} ({formatBytes(activeJob.fileSize)})
                      </p>
                    </div>
                  </div>

                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                    {activeJob.job.status}
                  </span>
                </div>

                <div className="mt-4 pt-4 border-t border-emerald-200/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 font-medium">Job ID:</span>
                    <span className="font-mono font-semibold text-slate-900 bg-white/80 px-2 py-0.5 rounded border border-emerald-200">
                      {activeJob.job.jobId}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyJobId}
                      className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 transition-colors ml-1"
                      title="Copy Job ID"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      <span className="text-[11px]">{copied ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-xs text-slate-600 space-y-1.5">
                <p className="font-medium text-slate-800">What happens next?</p>
                <p>
                  Your media has been streamed and stored in an isolated workspace.
                  In <strong>Phase 6</strong> (Queue Infrastructure) and <strong>Phase 7</strong> (Progress &amp; Polling UI),
                  this job will be dispatched to the background worker and progress will update live.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setActiveJob(null)}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Upload Another File
                </button>
              </div>
            </div>
          )}
        </section>

        {/* System Health Monitoring Section (Phase 3) */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
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
        </section>
      </main>
    </div>
  );
}

export default App;

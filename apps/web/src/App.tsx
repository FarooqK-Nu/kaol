import { useEffect, useState } from "react";
import type { JobStatus } from "@kaol/shared-types";

export function App() {
  const [apiStatus, setApiStatus] = useState<string>("checking...");
  const [initialStatus] = useState<JobStatus>("queued");

  useEffect(() => {
    fetch("/api/ping")
      .then((res) => res.json())
      .then((data) => setApiStatus(`Connected (${data.status})`))
      .catch(() => setApiStatus("Disconnected (Backend offline)"));
  }, []);

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
          <h2 className="text-lg font-semibold text-slate-800">System Foundation (Phase 1)</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-slate-50 p-4 border border-slate-100">
              <span className="text-xs font-medium uppercase text-slate-500">API Connection</span>
              <p className="mt-1 text-sm font-semibold text-slate-800">{apiStatus}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4 border border-slate-100">
              <span className="text-xs font-medium uppercase text-slate-500">Contract Verification</span>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                JobStatus: <span className="font-mono text-emerald-600">{initialStatus}</span>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;

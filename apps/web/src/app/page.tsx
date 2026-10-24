"use client";

import { useEffect, useState } from "react";
import { healthResponseSchema, type HealthResponse } from "@receipts/shared";
import { config } from "@/config";

type State =
  | { kind: "loading" }
  | { kind: "unreachable" }
  | { kind: "loaded"; health: HealthResponse };

async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${config.apiUrl}/health`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
  // 503 carries the same body shape as 200, so parse regardless of status
  return healthResponseSchema.parse(await res.json());
}

function CheckRow({ name, ok, ms, error }: { name: string; ok: boolean; ms: number; error?: string | undefined }) {
  return (
    <li className="flex items-center gap-3 rounded border border-black/10 px-4 py-3 dark:border-white/15">
      <span className={`h-3 w-3 rounded-full ${ok ? "bg-green-500" : "bg-red-500"}`} />
      <span className="w-16 font-mono">{name}</span>
      <span className="text-sm opacity-60">{ms} ms</span>
      {error ? <span className="text-sm text-red-500">{error}</span> : null}
    </li>
  );
}

export default function Home() {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    fetchHealth()
      .then((health) => setState({ kind: "loaded", health }))
      .catch(() => setState({ kind: "unreachable" }));
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-4 p-8">
      <h1 className="text-2xl font-semibold">receipts health</h1>
      {state.kind === "loading" ? <p>checking...</p> : null}
      {state.kind === "unreachable" ? <p className="text-red-500">api unreachable</p> : null}
      {state.kind === "loaded" ? (
        <>
          <p>status: {state.health.status}</p>
          <ul className="flex flex-col gap-2">
            {Object.entries(state.health.checks).map(([name, check]) => (
              <CheckRow key={name} name={name} ok={check.ok} ms={check.ms} error={check.error} />
            ))}
          </ul>
        </>
      ) : null}
    </main>
  );
}

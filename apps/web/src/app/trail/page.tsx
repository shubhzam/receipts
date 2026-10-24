"use client";

import { useEffect, useState } from "react";
import type { AgentEventView } from "@receipts/shared";
import { fetchEvents } from "@/orders-api";
import { cardClass } from "@/ui";

const REFRESH_MS = 5000;

export default function TrailPage() {
  const [events, setEvents] = useState<AgentEventView[] | null>(null);
  const [problem, setProblem] = useState(false);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function load() {
      try {
        const body = await fetchEvents();
        if (stopped) return;
        setEvents(body.events);
        setProblem(false);
      } catch {
        if (!stopped) setProblem(true);
      }
      if (!stopped) timer = setTimeout(() => void load(), REFRESH_MS);
    }
    void load();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-3xl font-semibold">Trail</h1>
        <p className="mt-2 text-sm opacity-80">Every step the system takes on an order, newest first. Order ids are cut short and no tokens or card data are ever shown.</p>
      </div>
      {problem ? <p className="text-sm text-yellow-700 dark:text-yellow-400">Could not reach the server, trying again.</p> : null}
      {events === null ? <p className="text-sm">Loading...</p> : null}
      {events?.length === 0 ? <p className="text-sm">No events yet.</p> : null}
      <ul className="flex flex-col gap-2">
        {events?.map((event) => (
          <li key={event.id} className={`${cardClass} flex flex-col gap-1 py-3 text-sm`}>
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono font-medium">{event.step}</span>
              <span className="font-mono text-xs opacity-60">{event.orderId ?? "no order"}</span>
              <span className="ml-auto text-xs opacity-60">{new Date(event.createdAt).toLocaleString()}</span>
            </div>
            <span className="opacity-80">{event.reasoning}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}

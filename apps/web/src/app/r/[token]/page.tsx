"use client";

import { Suspense, use, useEffect, useState } from "react";
import Link from "next/link";
import type { OrderResponse } from "@receipts/shared";
import { config } from "@/config";
import { formatDollars, itemLabel } from "@/format";
import { ApiError, fetchOrder, startCheckout } from "@/orders-api";
import { buttonClass, cardClass, ghostButtonClass } from "@/ui";

const POLL_MS = 2000;
const RETRY_MS = 4000;

type Preview = OrderResponse["preview"];

const statusStyle: Record<string, string> = {
  present: "bg-green-500/15 text-green-700 dark:text-green-400",
  missing: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  contradicts: "bg-red-500/15 text-red-700 dark:text-red-400",
};

const statusWord: Record<string, string> = {
  present: "supports you",
  missing: "missing",
  contradicts: "supports the customer",
};

function Items({ items }: { items: Preview["items"] }) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item.item} className="flex flex-col gap-1 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium capitalize">{itemLabel(item.item)}</span>
            <span className={`rounded px-2 py-0.5 text-xs ${statusStyle[item.status]}`}>{statusWord[item.status]}</span>
          </div>
          <span className="opacity-80">{item.value}</span>
        </li>
      ))}
    </ul>
  );
}

const decisionText: Record<Preview["decision"], string> = {
  DISPUTE: "Dispute it. Your proof supports a fight.",
  ESCALATE: "Escalate. The proof is mixed, so ask for a manual review.",
  ACCEPT: "Accept it. The proof is too thin to win.",
};

function PreviewCard({ preview }: { preview: Preview }) {
  return (
    <section className={`${cardClass} flex flex-col gap-4`}>
      <div>
        <p className="text-xs uppercase tracking-wide opacity-60">Free preview</p>
        <h2 className="text-xl font-semibold">{decisionText[preview.decision]}</h2>
      </div>
      <Items items={preview.items} />
    </section>
  );
}

function BuyBox({ token, preview, reopen }: { token: string; preview: Preview; reopen: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buy() {
    setBusy(true);
    setError(null);
    try {
      const { purchaseUrl } = await startCheckout(token);
      window.location.assign(purchaseUrl);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "could not reach the server, please try again");
      setBusy(false);
    }
  }

  if (preview.decision === "ACCEPT") {
    return (
      <section className={`${cardClass} flex flex-col gap-3`}>
        <p className="text-sm">
          We recommend accepting this dispute. Writing a reply for a dispute the proof cannot win would not be honest, so there is nothing to buy here.
        </p>
        <div>
          <Link href="/start" className={`${ghostButtonClass} inline-block`}>
            Check another dispute
          </Link>
        </div>
      </section>
    );
  }
  return (
    <section className={`${cardClass} flex flex-col gap-3`}>
      <p className="text-sm">
        {reopen ? "Your checkout is open. If you closed it, you can open it again." : `The written reply for this dispute costs ${formatDollars(config.priceCents)}.`}
      </p>
      <p className="text-xs opacity-60">Test mode: checkout runs on the Whop sandbox, so only test cards work and no real money moves.</p>
      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      <div>
        <button className={buttonClass} disabled={busy} onClick={() => void buy()}>
          {busy ? "Opening checkout..." : reopen ? "Open checkout again" : `Buy the reply for ${formatDollars(config.priceCents)}`}
        </button>
      </div>
    </section>
  );
}

function Result({ order }: { order: OrderResponse }) {
  const [copied, setCopied] = useState(false);
  const result = order.result;
  if (!result) return null;

  async function copy() {
    await navigator.clipboard.writeText(result!.replyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <section className={`${cardClass} print-card flex flex-col gap-4`}>
        <h2 className="text-xl font-semibold">Your reply</h2>
        <p className="whitespace-pre-wrap text-base leading-relaxed">{result.replyText}</p>
        <div className="no-print flex gap-3">
          <button className={buttonClass} onClick={() => void copy()}>
            {copied ? "Copied" : "Copy reply"}
          </button>
          <button className={ghostButtonClass} onClick={() => window.print()}>
            Print or save as PDF
          </button>
        </div>
      </section>
      <section className={`${cardClass} no-print flex flex-col gap-4`}>
        <h2 className="text-lg font-semibold">The proof behind it</h2>
        <Items items={result.items} />
      </section>
    </>
  );
}

function Waiting({ text }: { text: string }) {
  return (
    <section className={`${cardClass} flex items-center gap-3`}>
      <span className="h-3 w-3 animate-pulse rounded-full bg-foreground" />
      <p className="text-sm">{text}</p>
    </section>
  );
}

function OrderView({ token }: { token: string }) {
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  // polls our own order state every 2s while a payment or the writer is still pending
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function load() {
      try {
        const next = await fetchOrder(token);
        if (stopped) return;
        setOrder(next);
        setProblem(null);
        if (next.status === "pending_payment" || next.status === "paid") timer = setTimeout(() => void load(), POLL_MS);
      } catch (err) {
        if (stopped) return;
        if (err instanceof ApiError && err.status === 404) return setProblem("We could not find this order. Check the link you were given.");
        setProblem("Could not reach the server, trying again.");
        timer = setTimeout(() => void load(), RETRY_MS);
      }
    }
    void load();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [token]);

  if (!order) return <p className="text-sm">{problem ?? "Loading your order..."}</p>;

  return (
    <>
      {problem ? <p className="text-sm text-yellow-700 dark:text-yellow-400">{problem}</p> : null}
      {order.status === "fulfilled" ? <Result order={order} /> : <PreviewCard preview={order.preview} />}
      {order.status === "draft" ? <BuyBox token={token} preview={order.preview} reopen={false} /> : null}
      {order.status === "pending_payment" ? (
        <>
          <Waiting text="Waiting for payment confirmation. This page updates by itself once the payment lands." />
          <BuyBox token={token} preview={order.preview} reopen />
        </>
      ) : null}
      {order.status === "paid" ? <Waiting text="Payment confirmed. We are writing and checking your reply, this takes under a minute." /> : null}
      {order.status === "failed" ? (
        <section className={cardClass}>
          <p className="text-sm">Something went wrong with this order and no reply was delivered. Please contact us with this link, we will fix or refund it.</p>
        </section>
      ) : null}
    </>
  );
}

function TokenBody({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  return <OrderView key={token} token={token} />;
}

export default function OrderPage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <h1 className="no-print text-3xl font-semibold">Your dispute</h1>
      <Suspense fallback={<p className="text-sm">Loading your order...</p>}>
        <TokenBody params={params} />
      </Suspense>
    </main>
  );
}

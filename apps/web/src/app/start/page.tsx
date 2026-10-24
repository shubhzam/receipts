"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createOrder, ApiError } from "@/orders-api";
import { buttonClass, inputClass } from "@/ui";
import { buildIntake, fieldsByReason, reasonOptions, type Field, type FormValues, type Reason } from "./fields";

function FieldInput({ field, values, set }: { field: Field; values: FormValues; set: (key: string, value: string) => void }) {
  const value = values[field.key] ?? "";
  switch (field.kind) {
    case "bool":
      return (
        <div className="flex gap-5 text-sm">
          {["yes", "no"].map((choice) => (
            <label key={choice} className="flex items-center gap-2">
              <input type="radio" name={field.key} value={choice} checked={value === choice} onChange={() => set(field.key, choice)} />
              {choice}
            </label>
          ))}
        </div>
      );
    case "select":
      return (
        <select className={inputClass} value={value} onChange={(e) => set(field.key, e.target.value)}>
          <option value="">choose one</option>
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    case "lines":
      return <textarea className={inputClass} rows={3} value={value} onChange={(e) => set(field.key, e.target.value)} />;
    case "pair":
      return (
        <div className="grid grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <input key={i} className={inputClass} placeholder={i === 0 ? "first" : "second"} value={values[`${field.key}${i}`] ?? ""} onChange={(e) => set(`${field.key}${i}`, e.target.value)} />
          ))}
        </div>
      );
    case "utc":
    case "nullableUtc":
      return <input type="datetime-local" className={inputClass} value={value} onChange={(e) => set(field.key, e.target.value)} />;
    case "date":
      return <input type="date" className={inputClass} value={value} onChange={(e) => set(field.key, e.target.value)} />;
    case "int":
    case "nullableInt":
      return <input type="number" min={0} step={1} className={inputClass} value={value} onChange={(e) => set(field.key, e.target.value)} />;
    default:
      return <input type="text" className={inputClass} value={value} onChange={(e) => set(field.key, e.target.value)} />;
  }
}

export default function StartPage() {
  const router = useRouter();
  const [reason, setReason] = useState<Reason | "">("");
  const [orderRef, setOrderRef] = useState("");
  const [amount, setAmount] = useState("");
  const [claimText, setClaimText] = useState("");
  const [values, setValues] = useState<FormValues>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const set = (key: string, value: string) => setValues((prev) => ({ ...prev, [key]: value }));

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!reason) return setErrors(["Choose the dispute reason first"]);
    const built = buildIntake(reason, { orderRef, amount, claimText }, values);
    if (!built.ok) return setErrors(built.errors);
    setErrors([]);
    setBusy(true);
    try {
      const { token } = await createOrder(built.intake);
      router.push(`/r/${token}`);
    } catch (err) {
      setErrors([err instanceof ApiError ? err.message : "could not reach the server, please try again"]);
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-3xl font-semibold">Tell us about the dispute</h1>
        <p className="mt-2 text-sm opacity-80">
          One dispute at a time. Enter only what you can prove, and leave things empty when you have nothing. Never type a card number, the form rejects it.
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Dispute reason</span>
          <select className={inputClass} value={reason} onChange={(e) => { setReason(e.target.value as Reason | ""); setValues({}); }}>
            <option value="">choose one</option>
            {reasonOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Order reference</span>
            <input className={inputClass} value={orderRef} onChange={(e) => setOrderRef(e.target.value)} placeholder="ORD-2231" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Disputed amount in dollars</span>
            <input className={inputClass} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="19.00" />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">What the customer claims</span>
          <textarea className={inputClass} rows={3} value={claimText} onChange={(e) => setClaimText(e.target.value)} />
        </label>

        {reason ? (
          <fieldset className="flex flex-col gap-4 border-t border-black/10 pt-5 dark:border-white/15">
            <legend className="pr-3 text-sm font-medium opacity-70">Your proof</legend>
            {fieldsByReason[reason].map((field) => (
              <div key={field.key} className="flex flex-col gap-1 text-sm">
                <span className="font-medium">{field.label}</span>
                {field.hint ? <span className="text-xs opacity-60">{field.hint}</span> : null}
                <FieldInput field={field} values={values} set={set} />
              </div>
            ))}
          </fieldset>
        ) : null}

        {errors.length > 0 ? (
          <ul className="list-disc pl-5 text-sm text-red-600 dark:text-red-400">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        ) : null}

        <div>
          <button type="submit" disabled={busy} className={buttonClass}>
            {busy ? "Checking..." : "See the free preview"}
          </button>
        </div>
      </form>
    </main>
  );
}

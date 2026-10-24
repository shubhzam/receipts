import Link from "next/link";
import { config } from "@/config";
import { formatDollars } from "@/format";
import { buttonClass, cardClass } from "@/ui";

const steps = [
  { title: "Tell us what you can prove", body: "Pick the dispute reason and fill in the proof you have: emails, login counts, dates, policy text. Say plainly when you do not have something." },
  { title: "See the decision for free", body: "A fixed rule list reads your proof and shows each item as present, missing or contradicting, then gives one of three decisions. No AI is involved in this step." },
  { title: "Pay only if the proof supports a fight", body: "If the decision is dispute or escalate you can buy the written reply. If the proof is too thin to win, we say so and recommend accepting the dispute." },
];

const limits = [
  "We write the reply text. You paste it into your payment processor yourself, we do not file anything.",
  "We cannot promise you win. The card network decides, and a good reply only helps when the facts are on your side.",
  "The reply uses only the proof you entered. If you enter something untrue, the reply will repeat it, and that is on you.",
  "Six dispute reasons are covered: fraud, item not received, not as described, subscription canceled, duplicate charge and refund not processed.",
  "No accounts and no email. Your reply lives at a private link, keep it safe.",
];

export default function Landing() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-14 px-6 py-14">
      <section className="flex flex-col gap-5">
        <h1 className="text-4xl font-semibold leading-tight">A written reply to your card dispute, built from your own proof.</h1>
        <p className="text-lg opacity-80">
          Fill in what you can prove about one chargeback. See for free whether the proof supports a fight. If it does, pay{" "}
          {formatDollars(config.priceCents)} for that dispute and get a reply ready to paste.
        </p>
        <div>
          <Link href="/start" className={`${buttonClass} inline-block`}>
            Check a dispute for free
          </Link>
        </div>
      </section>

      <section className="flex flex-col gap-5">
        <h2 className="text-2xl font-semibold">One product</h2>
        <div className={cardClass}>
          <p className="text-xl font-medium">Dispute reply pack, {formatDollars(config.priceCents)} per dispute</p>
          <p className="mt-2 text-sm opacity-80">
            One written reply for one dispute, in plain prose, with the order reference, the amount and every proof point you gave us. Copy it, or print the page to save a PDF.
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-5">
        <h2 className="text-2xl font-semibold">How the decision works</h2>
        <ol className="flex flex-col gap-4">
          {steps.map((step, i) => (
            <li key={step.title} className="flex gap-4">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-black/20 text-sm dark:border-white/25">{i + 1}</span>
              <div>
                <p className="font-medium">{step.title}</p>
                <p className="text-sm opacity-80">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="text-sm opacity-80">
          The writer is only given the checked proof items. After it writes, a fact check confirms that every number, date, id and email in the reply came from those items, and a reply that fails the check is never shown.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold">Honest limits</h2>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-sm opacity-80">
          {limits.map((limit) => (
            <li key={limit}>{limit}</li>
          ))}
        </ul>
      </section>

      <section>
        <Link href="/start" className={`${buttonClass} inline-block`}>
          Check a dispute for free
        </Link>
      </section>
    </main>
  );
}

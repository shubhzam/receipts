"use client";

import { useEffect } from "react";

const AUTO_REDIRECT_MS = 2500;

// the one place the participant is sent back to terac, after the last case
export function DoneNotice({ redirectUrl }: { redirectUrl: string }) {
  useEffect(() => {
    const timer = setTimeout(() => window.location.assign(redirectUrl), AUTO_REDIRECT_MS);
    return () => clearTimeout(timer);
  }, [redirectUrl]);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-lg font-semibold">thank you, all your votes are saved.</p>
      <p>sending you back to Terac... if nothing happens, use the link below so you get paid.</p>
      <a href={redirectUrl} className="rounded bg-black px-4 py-3 text-center text-white">
        return to Terac
      </a>
    </div>
  );
}

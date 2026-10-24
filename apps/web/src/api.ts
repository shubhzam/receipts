import { config } from "@/config";

// every api call goes through here so the ngrok interstitial is always skipped
export function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("ngrok-skip-browser-warning", "1");
  return fetch(`${config.apiUrl}${path}`, { ...init, headers });
}

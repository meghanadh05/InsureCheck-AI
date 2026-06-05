// NEXT_PUBLIC_API_URL  — required for all deployments (Vercel + browser)
// API_URL_INTERNAL     — optional override for server-side only (Docker internal network)
// Falls back: internal → public → localhost (local dev only)
const PUBLIC_API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const INTERNAL_API_URL =
  process.env.API_URL_INTERNAL || PUBLIC_API_URL;

export const API_URL =
  typeof window === "undefined" ? INTERNAL_API_URL : PUBLIC_API_URL;

export const BACKEND_UNREACHABLE_MESSAGE =
  "Backend is not reachable. Start the API server or check NEXT_PUBLIC_API_URL.";

export type ApiState<T> = {
  data: T;
  error: string | null;
};

export async function getJson<T>(path: string, fallback: T): Promise<ApiState<T>> {
  try {
    const response = await fetch(`${API_URL}${path}`, { cache: "no-store" });
    if (!response.ok) {
      return { data: fallback, error: `API ${response.status}: ${response.statusText}` };
    }
    return { data: (await response.json()) as T, error: null };
  } catch (error) {
    return { data: fallback, error: `${BACKEND_UNREACHABLE_MESSAGE} ${String(error)}` };
  }
}

export async function postJson<T>(path: string, fallback: T): Promise<ApiState<T>> {
  try {
    const response = await fetch(`${API_URL}${path}`, { method: "POST", cache: "no-store" });
    if (!response.ok) {
      return { data: fallback, error: `API ${response.status}: ${response.statusText}` };
    }
    return { data: (await response.json()) as T, error: null };
  } catch (error) {
    return { data: fallback, error: `${BACKEND_UNREACHABLE_MESSAGE} ${String(error)}` };
  }
}

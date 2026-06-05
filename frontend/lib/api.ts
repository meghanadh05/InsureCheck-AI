export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export const BACKEND_UNREACHABLE_MESSAGE =
  "Backend is not reachable. Check the deployed API URL or try again after the backend wakes up.";

export type ApiState<T> = {
  data: T;
  error: string | null;
};

export async function getJson<T>(path: string, fallback: T): Promise<ApiState<T>> {
  try {
    const response = await fetch(`${API_URL}${path}`, { cache: "no-store" });
    if (!response.ok) {
      return { data: fallback, error: `API error ${response.status}: ${response.statusText}` };
    }
    return { data: (await response.json()) as T, error: null };
  } catch {
    return { data: fallback, error: BACKEND_UNREACHABLE_MESSAGE };
  }
}

export async function postJson<T>(path: string, fallback: T): Promise<ApiState<T>> {
  try {
    const response = await fetch(`${API_URL}${path}`, { method: "POST", cache: "no-store" });
    if (!response.ok) {
      return { data: fallback, error: `API error ${response.status}: ${response.statusText}` };
    }
    return { data: (await response.json()) as T, error: null };
  } catch {
    return { data: fallback, error: BACKEND_UNREACHABLE_MESSAGE };
  }
}

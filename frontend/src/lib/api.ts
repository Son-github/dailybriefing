import { runtime, isStaticDemo, backendUnavailable } from "./runtime";
import { logDataFetch } from "./dataFetchLog";
import { showError } from "./errors";
import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { useSession } from "./store";
import type { Profile } from "../types";
export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (error instanceof ApiError && query.meta?.silentError !== true)
        showError(error, "정보 조회 중 문제가 발생했어요.", () =>
          queryClient.refetchQueries({ queryKey: query.queryKey, exact: true }),
        );
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      if (error instanceof ApiError)
        showError(error, "변경 내용을 처리하지 못했어요.");
    },
  }),
  defaultOptions: {
    queries: { staleTime: 60_000, retry: false, refetchOnWindowFocus: false },
  },
});
const base = () =>
  runtime().mode === "LOCAL"
    ? import.meta.env.VITE_API_BASE || runtime().apiBase
    : runtime().apiBase;
let csrf: string | null = null;
let sessionGeneration = 0;
let refreshPromise: Promise<boolean> | null = null;
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public requestId?: string,
    public details?: { provider?: string; upstreamStatus?: number },
  ) {
    super(message);
  }
}
async function csrfToken() {
  if (!csrf) {
    let res: Response;
    try {
      res = await fetch(`${base()}/auth/csrf`, {
        credentials: "include",
        signal: AbortSignal.timeout(15000),
      });
    } catch (error) {
      throw new ApiError(
        0,
        error instanceof DOMException && error.name === "TimeoutError"
          ? "TIMEOUT"
          : "NETWORK",
        "보안 연결을 준비하지 못했어요.",
      );
    }
    if (!res.ok)
      throw new ApiError(
        res.status,
        "SECURITY",
        "보안 연결을 준비하지 못했어요.",
      );
    csrf = ((await res.json()) as { token: string }).token;
  }
  return csrf;
}
export async function refresh(): Promise<boolean> {
  if (isStaticDemo() || backendUnavailable()) {
    clearSession();
    return false;
  }
  if (refreshPromise) return refreshPromise;
  const generation = sessionGeneration;
  refreshPromise = (async () => {
    try {
      const data = await api<{ accessToken: string; user: Profile }>(
        "/auth/refresh",
        { method: "POST" },
        false,
      );
      // 로그아웃/탈퇴 이후 늦게 끝난 refresh 응답으로 인증이 살아나지 않도록 합니다.
      if (generation !== sessionGeneration) return false;
      useSession.getState().setSession(data.accessToken, data.user);
      useSession.getState().setTheme(data.user.theme);
      return true;
    } catch {
      if (generation === sessionGeneration) clearSession();
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}
export async function api<T>(
  path: string,
  init: RequestInit = {},
  recover = true,
): Promise<T> {
  if (isStaticDemo()) {
    try {
      const { staticDemoApi } = await import("../features/demo/staticApi");
      const result = staticDemoApi<T>(path, init);
      logDataFetch(
        path,
        200,
        new Headers({ "X-Data-Mode": "DEMO", "X-Data-Result": "SUCCESS" }),
      );
      return result;
    } catch {
      throw new ApiError(
        503,
        "STATIC_DEMO_UNSUPPORTED",
        "샘플 체험에서는 계정과 개인 서버 저장 기능을 사용할 수 없어요.",
      );
    }
  }
  if (backendUnavailable())
    throw new ApiError(
      503,
      "BACKEND_UNAVAILABLE",
      "실제 서버 연결을 확인하지 못했어요. 샘플 체험으로 전환하거나 다시 연결해 주세요.",
    );
  const headers = new Headers(init.headers);
  const token = useSession.getState().token;
  if (token && !path.startsWith("/auth/"))
    headers.set("Authorization", `Bearer ${token}`);
  if (init.body) headers.set("Content-Type", "application/json");
  if (init.method && init.method !== "GET")
    headers.set("X-XSRF-TOKEN", await csrfToken());
  let res: Response;
  try {
    res = await fetch(`${base()}${path}`, {
      ...init,
      headers,
      credentials: "include",
      signal: init.signal
        ? AbortSignal.any([init.signal, AbortSignal.timeout(15000)])
        : AbortSignal.timeout(15000),
    });
  } catch (error) {
    if (init.signal?.aborted) throw error;
    logDataFetch(path, 0);
    throw new ApiError(
      0,
      error instanceof DOMException && error.name === "TimeoutError"
        ? "TIMEOUT"
        : "NETWORK",
      "서비스 연결을 확인해 주세요.",
    );
  }
  if (res.status === 401 && recover && token && !path.startsWith("/auth/")) {
    if (await refresh()) return api<T>(path, init, false);
    queryClient.clear();
  }
  if (!res.ok) {
    logDataFetch(path, res.status, res.headers);
    const data = await res.json().catch(() => ({}));
    throw new ApiError(
      res.status,
      data.code || "NETWORK",
      data.message || "정보를 불러오지 못했어요.",
      data.requestId || res.headers.get("X-Request-ID") || undefined,
      data.details,
    );
  }
  if (res.status === 204 || res.headers.get("content-length") === "0")
    return undefined as T;
  const text = await res.text();
  const data = text ? (JSON.parse(text) as T) : (undefined as T);
  logDataFetch(path, res.status, res.headers);
  return data;
}
export async function logout() {
  await api("/auth/logout", { method: "POST" });
  clearSession();
}
export function body(value: unknown): RequestInit {
  return { body: JSON.stringify(value) };
}
export function locationQuery(user: Profile | null) {
  return `latitude=${user?.latitude ?? 37.5665}&longitude=${user?.longitude ?? 126.978}`;
}

// 계정 전환/탈퇴 시 이전 개인 query와 진행 중 요청을 함께 비워 화면 잔상을 방지합니다.
export function clearSession() {
  sessionGeneration += 1;
  void queryClient.cancelQueries();
  useSession.getState().setSession(null, null);
  queryClient.clear();
}

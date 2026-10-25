import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Profile } from "../types";

vi.mock("../lib/runtime", () => ({
  runtime: () => ({ mode: "LOCAL", apiBase: "/api/v1" }),
  isStaticDemo: () => false,
  backendUnavailable: () => false,
}));

const user: Profile = {
  id: "test-user", email: "test@example.com", nickname: "테스트",
  locationName: "서울", latitude: 37.5665, longitude: 126.978,
  theme: "SYSTEM", onboarded: true, categories: [], keywords: [],
};
let client: typeof import("../lib/api");
let session: typeof import("../lib/store");
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), {
  status, headers: { "Content-Type": "application/json" },
});
beforeEach(async () => {
  vi.resetModules();
  client = await import("../lib/api");
  session = await import("../lib/store");
  session.useSession.getState().setSession("test-access-token", user);
});
afterEach(() => {
  client.clearSession();
  vi.unstubAllGlobals();
});

it("쿠키의 CSRF가 바뀐 뒤에도 최신 토큰으로 로그아웃하고 개인 캐시를 비운다", async () => {
  let serverToken = "old-csrf";
  const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).endsWith("/auth/csrf")) return json({ token: serverToken });
    if (String(input).endsWith("/auth/login")) return json({});
    if (String(input).endsWith("/auth/logout")) {
      expect(init?.credentials).toBe("include");
      return new Headers(init?.headers).get("X-XSRF-TOKEN") === serverToken
        ? new Response(null, { status: 204 })
        : json({ code: "FORBIDDEN", requestId: "csrf-mismatch" }, 403);
    }
    throw new Error("예상하지 못한 요청");
  });
  vi.stubGlobal("fetch", fetch);
  await client.api("/auth/login", { method: "POST" });
  // 다른 탭/요청이 공유 CSRF 쿠키를 바꾼 상황을 재현합니다.
  serverToken = "current-csrf";
  client.queryClient.setQueryData(["private-profile"], user);
  await client.logout();
  expect(session.useSession.getState().user).toBeNull();
  expect(session.useSession.getState().token).toBeNull();
  expect(client.queryClient.getQueryData(["private-profile"])).toBeUndefined();
});

it("서버 로그아웃 실패를 숨기거나 성공으로 처리하지 않는다", async () => {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) =>
    String(input).endsWith("/auth/csrf")
      ? json({ token: "current-csrf" })
      : json({ code: "FORBIDDEN", requestId: "denied-request" }, 403),
  ));
  await expect(client.logout()).rejects.toMatchObject({
    code: "FORBIDDEN", requestId: "denied-request",
  });
  expect(session.useSession.getState().user).toEqual(user);
});

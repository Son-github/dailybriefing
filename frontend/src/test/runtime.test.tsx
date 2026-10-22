import { afterEach, expect, it, vi } from "vitest";
import {
  initializeRuntime,
  runtime,
  isStaticDemo,
  backendUnavailable,
  parseRuntime,
} from "../lib/runtime";
import { staticDemoApi } from "../features/demo/staticApi";
const config = {
  schemaVersion: 1,
  mode: "STATIC_DEMO",
  liveEnabled: false,
  apiBase: "/api/v1",
  kakaoMapKey: "",
};
afterEach(async () => {
  sessionStorage.clear();
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({ ...config, mode: "LOCAL", liveEnabled: true }),
      }),
  );
  await initializeRuntime();
  vi.unstubAllGlobals();
});
it("공개 설정은 같은 출처 API 경로만 허용한다", () => {
  expect(parseRuntime(config).mode).toBe("STATIC_DEMO");
  expect(() =>
    parseRuntime({ ...config, apiBase: "https://untrusted.invalid/api" }),
  ).toThrow();
  expect(() => parseRuntime({ ...config, mode: "LIVE" })).toThrow();
});
it("정적 DEMO는 초기화 후 백엔드 요청 없이 샘플을 제공한다", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue({ ok: true, json: async () => config });
  vi.stubGlobal("fetch", fetch);
  await initializeRuntime();
  expect(isStaticDemo()).toBe(true);
  expect(fetch).toHaveBeenCalledTimes(1);
  const { api, refresh } = await import("../lib/api");
  expect(await refresh()).toBe(false);
  const weather = await api<{ meta: { mode: string } }>("/weather");
  expect(weather.meta.mode).toBe("DEMO");
  expect(fetch).toHaveBeenCalledTimes(1);
  await expect(
    api("/auth/signup", { method: "POST", body: "{}" }),
  ).rejects.toMatchObject({ code: "STATIC_DEMO_UNSUPPORTED" });
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("LIVE 설정이 켜져 있어도 health 실패를 연결 성공이나 샘플로 간주하지 않는다", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...config, mode: "LIVE", liveEnabled: true }),
    })
    .mockRejectedValueOnce(new Error("offline"));
  vi.stubGlobal("fetch", fetch);
  await initializeRuntime();
  expect(runtime().mode).toBe("LIVE");
  expect(backendUnavailable()).toBe(true);
  expect(isStaticDemo()).toBe(false);
  const { api } = await import("../lib/api");
  await expect(api("/weather")).rejects.toMatchObject({
    code: "BACKEND_UNAVAILABLE",
  });
  expect(fetch).toHaveBeenCalledTimes(2);
});
it("샘플 뉴스 페이지와 경로에는 DEMO 출처를 명시한다", () => {
  const news = staticDemoApi<{
    items: unknown[];
    nextStart: number;
    meta: { mode: string };
  }>("/news?category=IT&start=6&display=10", {});
  expect(news.items).toHaveLength(10);
  expect(news.nextStart).toBe(16);
  expect(news.meta.mode).toBe("DEMO");
  expect(() => staticDemoApi("/users/me", {})).toThrow();
});

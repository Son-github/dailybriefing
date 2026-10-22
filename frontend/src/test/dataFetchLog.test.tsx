import { afterEach, expect, it, vi } from "vitest";
import { logDataFetch } from "../lib/dataFetchLog";
afterEach(() => vi.restoreAllMocks());
it("샘플/빈결과/부분실패를 구분하고 query와 credential을 출력하지 않는다", () => {
  const info = vi.spyOn(console, "info").mockImplementation(() => {});
  logDataFetch("/weather?latitude=37.123&key=secret", 200, new Headers({ "X-Data-Mode": "DEMO", "X-Data-Result": "SUCCESS", "X-Request-ID": "ref-1" }));
  expect(info).toHaveBeenLastCalledWith("[Daily Briefing] 데이터 조회", expect.objectContaining({ endpoint: "/weather", mode: "샘플 데이터 (외부 API 미호출)", result: "데이터 수신 완료", requestId: "ref-1" }));
  expect(JSON.stringify(info.mock.calls)).not.toMatch(/37\.123|secret/);
  logDataFetch("/news/sections", 200, new Headers({ "X-Data-Mode": "LIVE", "X-Data-Result": "PARTIAL" }));
  expect(info).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({ result: "일부 실패" }));
  logDataFetch("/calendar/holidays", 200, new Headers({ "X-Data-Result": "EMPTY" }));
  expect(info).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({ result: "조회 완료 · 결과 없음" }));
});
it("인증과 개인정보 요청은 기록하지 않으며 네트워크 실패는 성공으로 표시하지 않는다", () => {
  const info = vi.spyOn(console, "info").mockImplementation(() => {});
  logDataFetch("/auth/login", 401); logDataFetch("/users/me", 200); expect(info).not.toHaveBeenCalled();
  logDataFetch("/weather", 0);
  expect(info).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({ result: "연결 실패" }));
});

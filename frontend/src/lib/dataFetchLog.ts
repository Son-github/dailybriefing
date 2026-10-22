// 본문·검색어·좌표·인증 정보는 콘솔에 기록하지 않습니다. 외부정보 조회 경로만 허용합니다.
const dataEndpoints = new Set([
  "/weather", "/exchange-rates", "/news", "/news/sections",
  "/mobility/places", "/mobility/location", "/mobility/routes", "/calendar/holidays",
]);
export function logDataFetch(path: string, status: number, headers?: Headers) {
  const endpoint = path.split("?")[0];
  if (!dataEndpoints.has(endpoint)) return;
  const rawMode = headers?.get("X-Data-Mode");
  const mode = rawMode === "DEMO" ? "샘플 데이터 (외부 API 미호출)" : rawMode === "LIVE" ? "실제 API 모드" : "확인 불가";
  const rawResult = headers?.get("X-Data-Result");
  const result = status === 0 ? "연결 실패" : status >= 400 ? "실패" : rawResult === "PARTIAL" ? "일부 실패" : rawResult === "FAILED" ? "실패" : rawResult === "EMPTY" ? "조회 완료 · 결과 없음" : "데이터 수신 완료";
  console.info("[Daily Briefing] 데이터 조회", { endpoint, mode, result, httpStatus: status,
    requestId: headers?.get("X-Request-ID") || "없음" });
}

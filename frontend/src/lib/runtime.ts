export interface RuntimeConfig {
  schemaVersion: 1;
  mode: "LOCAL" | "STATIC_DEMO" | "LIVE";
  liveEnabled: boolean;
  apiBase: "/api/v1";
  kakaoMapKey: string;
}
let config: RuntimeConfig = {
  schemaVersion: 1,
  mode: "LOCAL",
  liveEnabled: true,
  apiBase: "/api/v1",
  kakaoMapKey: "",
};
let unavailable = false;
let configError = "";
export function runtime() {
  return config;
}
export function isStaticDemo() {
  return config.mode === "STATIC_DEMO";
}
export function backendUnavailable() {
  return unavailable;
}
export function runtimeError() {
  return configError;
}
export function parseRuntime(value: unknown): RuntimeConfig {
  if (!value || typeof value !== "object")
    throw new Error("실행 설정 형식이 올바르지 않아요.");
  const d = value as Record<string, unknown>;
  if (
    d.schemaVersion !== 1 ||
    !["LOCAL", "STATIC_DEMO", "LIVE"].includes(String(d.mode)) ||
    typeof d.liveEnabled !== "boolean" ||
    d.apiBase !== "/api/v1" ||
    typeof d.kakaoMapKey !== "string"
  )
    throw new Error(
      "실행 설정을 확인해 주세요. API 경로는 /api/v1만 허용합니다.",
    );
  if (d.mode === "LIVE" && !d.liveEnabled)
    throw new Error("LIVE가 비활성화된 설정이에요.");
  return d as unknown as RuntimeConfig;
}
// 공개 config에는 서버 키를 넣지 않습니다. API는 같은 출처만 허용해 쿠키/토큰 유출을 방지합니다.
export async function initializeRuntime(): Promise<void> {
  unavailable = false;
  configError = "";
  try {
    const response = await fetch("/runtime-config.json", {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error("실행 설정 파일을 읽지 못했어요.");
    config = parseRuntime(await response.json());
  } catch {
    config = {
      schemaVersion: 1,
      mode: "STATIC_DEMO",
      liveEnabled: false,
      apiBase: "/api/v1",
      kakaoMapKey: "",
    };
    configError =
      "실행 설정을 읽지 못해 샘플 체험만 제공해요. 실제 서비스 연결은 비활성화했어요.";
  }
  if (sessionStorage.getItem("db-static-demo") === "1")
    config = { ...config, mode: "STATIC_DEMO" };
  if (config.mode !== "LIVE") return;
  try {
    const response = await fetch(`${config.apiBase}/health`, {
      cache: "no-store",
      credentials: "include",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok || (await response.json()).status !== "UP")
      unavailable = true;
  } catch {
    unavailable = true;
  }
}
export function chooseStaticDemo() {
  sessionStorage.setItem("db-static-demo", "1");
  location.reload();
}
export function retryLive() {
  sessionStorage.removeItem("db-static-demo");
  location.reload();
}

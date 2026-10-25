import { beforeEach, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { errorGuide, showError, useErrorDialog } from "../lib/errors";
import { ErrorDialog } from "../components/ui/ErrorDialog";
import { ApiError } from "../lib/api";
import { currentLocation } from "../features/transit/location";
import { DatePicker } from "../components/ui/DateTimePicker";
beforeEach(() => useErrorDialog.getState().close());
it("지도 SDK 오류는 도메인과 JavaScript 키 확인을 안내한다", () => {
  const guide = errorGuide({ code: "MAP_SDK_LOAD_FAILED" });
  expect(guide.title).toContain("카카오 지도");
  expect(guide.steps.join()).toContain("www");
  expect(guide.steps.join()).toContain("JavaScript 키");
});
it("원인별 해결 방법과 비재시도 설정을 구분한다", () => {
  expect(
    errorGuide(new ApiError(503, "PROVIDER_NOT_CONFIGURED", "secret")),
  ).toMatchObject({ retryable: false, title: "서비스 연결 설정이 필요해요" });
  expect(errorGuide(new ApiError(0, "TIMEOUT", "timeout")).retryable).toBe(
    true,
  );
  expect(
    errorGuide(new ApiError(0, "LOCATION_DENIED", "denied")).steps.join(),
  ).toContain("장소 검색");
});
it("동시 실패는 창 하나로 합치고 검토된 안내와 요청번호를 표시한다", async () => {
  const retry = vi.fn();
  showError(
    new ApiError(502, "UPSTREAM_ERROR", "APIKEY=secret", "test-request"),
    "날씨 조회",
    retry,
  );
  showError(new ApiError(502, "UPSTREAM_ERROR", "second"));
  render(
    <MemoryRouter>
      <ErrorDialog />
    </MemoryRouter>,
  );
  expect(screen.getAllByRole("dialog")).toHaveLength(1);
  expect(screen.getByText("test-request")).toBeVisible();
  expect(screen.queryByText(/APIKEY/)).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: "다시 시도" }));
  expect(retry).toHaveBeenCalledOnce();
  expect(useErrorDialog.getState().notice).toBeNull();
});
it("GPS 위치 권한 거부는 알려진 오류로 처리한다", async () => {
  const getCurrentPosition = vi.fn((_success, error) => error({ code: 1 }));
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition },
  });
  expect(getCurrentPosition).not.toHaveBeenCalled();
  await expect(currentLocation()).rejects.toMatchObject({
    code: "LOCATION_DENIED",
  });
});
it("날짜 선택은 윤년 달력을 보여주고 선택 후 닫힌다", async () => {
  const change = vi.fn();
  render(<DatePicker label="날짜" value="2028-02-01" onChange={change} />);
  await userEvent.click(screen.getByRole("button", { name: "날짜 선택" }));
  await userEvent.click(
    screen.getByRole("button", { name: "2028년 2월 29일" }),
  );
  expect(change).toHaveBeenCalledWith("2028-02-29");
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("렌더링 오류는 해당 위젯만 격리한다", async () => {
  const { ErrorBoundary } = await import("../components/ui/ErrorBoundary");
  function Broken() {
    throw new Error("private stack details");
    return null;
  }
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  render(
    <div>
      <ErrorBoundary context="실패한 위젯">
        <Broken />
      </ErrorBoundary>
      <p>정상 위젯</p>
    </div>,
  );
  expect(screen.getByText("정상 위젯")).toBeVisible();
  expect(screen.getByText("이 화면을 표시하지 못했어요.")).toBeVisible();
  expect(useErrorDialog.getState().notice?.error.code).toBe("UI_ERROR");
  log.mockRestore();
});

it("기상청 키는 Decoding과 API허브 차이를 명확히 안내한다", () => {
  expect(errorGuide({ code: "KMA_KEY_ENCODING" }).steps.join()).toContain(
    "일반 인증키(Decoding)",
  );
  expect(errorGuide({ code: "KMA_KEY_ENCODING" }).retryable).toBe(false);
  expect(errorGuide({ code: "KMA_ENDPOINT_MISMATCH" }).cause).toContain(
    "authKey",
  );
  expect(errorGuide({ code: "WEATHER_UNAVAILABLE" }).cause).toContain("해상");
});

it("공급자와 HTTP 원인 및 카카오 비활성화 해결 방법을 표시한다", () => {
  const guide = errorGuide({
    code: "KAKAO_MAP_DISABLED",
    details: { provider: "KakaoMapTransit", upstreamStatus: 403 },
  });
  expect(guide.cause).toContain("OPEN_MAP_AND_LOCAL");
  expect(guide.steps.join()).toContain("사용 설정을 ON");
  expect(
    errorGuide({
      code: "PROVIDER_TLS",
      details: { provider: "KoreaExim", upstreamStatus: 0 },
    }).cause,
  ).toContain("HTTPS");
});

it("위젯 오류 화면에 원인과 코드, 요청번호가 바로 보인다", async () => {
  const { QueryContent } = await import("../components/ui/WidgetState");
  render(
    <QueryContent
      query={{
        isPending: false,
        isError: true,
        data: undefined,
        error: new ApiError(
          502,
          "KAKAO_MAP_DISABLED",
          "secret body",
          "request-403",
          { provider: "KakaoPlace", upstreamStatus: 403 },
        ),
        refetch: vi.fn(),
      }}
    >
      {() => <p>success</p>}
    </QueryContent>,
  );
  expect(screen.getByText("카카오맵 사용 설정이 꺼져 있어요")).toBeVisible();
  expect(screen.getByText("KAKAO_MAP_DISABLED")).toBeVisible();
  expect(screen.getByText("request-403")).toBeVisible();
  expect(screen.queryByText("secret body")).toBeNull();
});

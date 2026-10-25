import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  render as renderView,
  screen,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { MapPicker } from "../features/transit/MapPicker";
import { api } from "../lib/api";
import { useErrorDialog } from "../lib/errors";
import type { Place } from "../types";
vi.mock("../lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/api")>()),
  api: vi.fn(),
}));
const render = (ui: ReactNode) =>
  renderView(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      {ui}
    </QueryClientProvider>,
  );
class Coordinate {
  constructor(
    private lat: number,
    private lon: number,
  ) {}
  getLat() {
    return this.lat;
  }
  getLng() {
    return this.lon;
  }
}
let center = new Coordinate(37.5665, 126.978);
const listeners = new Map<string, (e?: { latLng: Coordinate }) => void>();
const address = (name: string, lat = 37.5665): Place => ({
  id: null,
  name,
  address: name,
  latitude: lat,
  longitude: 126.978,
  source: "MAP",
  category: null,
});
beforeEach(() => {
  useErrorDialog.getState().close();
  vi.mocked(api).mockReset();
  listeners.clear();
  center = new Coordinate(37.5665, 126.978);
  window.kakao = {
    maps: {
      load: (fn) => fn(),
      LatLng: Coordinate,
      Map: class {
        getCenter() {
          return center;
        }
        setCenter(point: Coordinate) {
          center = point;
          listeners.get("bounds_changed")?.();
          listeners.get("idle")?.();
        }
      },
      event: {
        addListener: (_target, type, fn) => {
          listeners.set(type, fn);
        },
        removeListener: (_target, type) => {
          listeners.delete(type);
        },
      },
    },
  };
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllEnvs();
  useErrorDialog.getState().close();
  delete window.kakao;
});
it("SDK 전역 객체가 남아 있어도 초기화가 끝나지 않으면 로딩을 종료한다", async () => {
  vi.useFakeTimers();
  window.kakao!.maps.load = () => {};
  render(<MapPicker initial={null} select={vi.fn()} close={vi.fn()} />);
  expect(screen.getByText("지도를 준비하고 있어요…")).toBeVisible();
  await act(async () => vi.advanceTimersByTimeAsync(10001));
  expect(screen.queryByText("지도를 준비하고 있어요…")).toBeNull();
  expect(screen.getByText("지도 초기화가 완료되지 않았어요.")).toBeVisible();
  expect(useErrorDialog.getState().notice?.error.code).toBe("MAP_SDK_TIMEOUT");
  expect(api).not.toHaveBeenCalled();
});
it("지도 CDN의 CSP 차단을 감지하면 타임아웃을 기다리지 않고 안내한다", async () => {
  window.kakao!.maps.load = () => {};
  render(<MapPicker initial={null} select={vi.fn()} close={vi.fn()} />);
  const event = new Event("securitypolicyviolation");
  Object.defineProperties(event, {
    effectiveDirective: { value: "script-src-elem" },
    blockedURI: { value: "https://t1.kakaocdn.net" },
  });
  await act(async () => document.dispatchEvent(event));
  expect(screen.queryByText("지도를 준비하고 있어요…")).toBeNull();
  expect(useErrorDialog.getState().notice?.error.code).toBe("MAP_SDK_BLOCKED");
  expect(api).not.toHaveBeenCalled();
});
it("지도 SDK 거절은 Backend NETWORK 오류와 구분하고 주소 API를 호출하지 않는다", async () => {
  delete window.kakao;
  vi.stubEnv("VITE_KAKAO_MAP_KEY", "test-map-key");
  render(<MapPicker initial={null} select={vi.fn()} close={vi.fn()} />);
  const script = document.head.querySelector<HTMLScriptElement>(
    'script[src^="https://dapi.kakao.com/v2/maps/sdk.js"]',
  );
  expect(script).not.toBeNull();
  await act(async () => script!.dispatchEvent(new Event("error")));
  expect(await screen.findByText(/카카오 지도 SDK를 불러오지 못했어요/)).toBeVisible();
  expect(useErrorDialog.getState().notice?.error.code).toBe("MAP_SDK_LOAD_FAILED");
  expect(api).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "이 위치로 설정" })).toBeDisabled();
});
it("주소를 확인하기 전에는 선택을 막고 좌표 대신 주소를 보여준다", async () => {
  vi.mocked(api).mockResolvedValue(address("서울특별시 중구 세종대로 110"));
  const select = vi.fn();
  render(
    <MapPicker
      initial={null}
      select={select}
      close={vi.fn()}
      purpose="도착지"
    />,
  );
  expect(screen.getByRole("button", { name: "이 위치로 설정" })).toBeDisabled();
  expect(screen.queryByText(/37\.56650/)).toBeNull();
  await screen.findByText("서울특별시 중구 세종대로 110");
  await userEvent.click(screen.getByRole("button", { name: "이 위치로 설정" }));
  expect(select).toHaveBeenCalledWith(
    expect.objectContaining({
      address: "서울특별시 중구 세종대로 110",
      source: "MAP",
    }),
  );
});
it("이동 중 늦게 도착한 옛 주소를 무시하고 핀과 새 주소를 갱신한다", async () => {
  let old: (p: Place) => void = () => {};
  vi.mocked(api)
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          old = resolve as (p: Place) => void;
        }),
    )
    .mockResolvedValue(address("새 위치의 도로명 주소", 37.5));
  const select = vi.fn();
  const { container } = render(
    <MapPicker initial={null} select={select} close={vi.fn()} />,
  );
  await waitFor(() => expect(api).toHaveBeenCalledTimes(1));
  act(() => {
    listeners.get("dragstart")?.();
  });
  expect(container.ownerDocument.querySelector(".map-pin")).toHaveClass(
    "is-moving",
  );
  expect(screen.getByRole("button", { name: "이 위치로 설정" })).toBeDisabled();
  act(() => {
    center = new Coordinate(37.5, 126.978);
    listeners.get("idle")?.();
  });
  await screen.findByText("새 위치의 도로명 주소");
  await act(async () => old(address("이전 주소")));
  expect(screen.queryByText("이전 주소")).toBeNull();
  expect(container.ownerDocument.querySelector(".map-pin")).toHaveClass(
    "is-settled",
  );
  await userEvent.click(screen.getByRole("button", { name: "이 위치로 설정" }));
  expect(select).toHaveBeenCalledWith(
    expect.objectContaining({
      latitude: 37.5,
      address: "새 위치의 도로명 주소",
    }),
  );
});
it("지도 안에서 장소를 검색하면 지도 중심과 선택할 주소가 함께 바뀐다", async () => {
  vi.mocked(api).mockImplementation(async (path) =>
    String(path).includes("/mobility/places")
      ? [
          {
            ...address("서울 강남구 영동대로 513", 37.512),
            id: "coex",
            name: "코엑스",
          },
        ]
      : address("서울특별시 중구 세종대로 110"),
  );
  render(
    <MapPicker
      initial={null}
      select={vi.fn()}
      close={vi.fn()}
      purpose="출발지"
    />,
  );
  await screen.findByText("서울특별시 중구 세종대로 110");
  await userEvent.type(
    screen.getByRole("combobox", { name: "출발지 검색" }),
    "코엑스",
  );
  await userEvent.click(await screen.findByRole("option", { name: /코엑스/ }));
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "이 위치로 설정" }),
    ).toBeEnabled(),
  );
  expect(screen.getByText("서울 강남구 영동대로 513")).toBeVisible();
  expect(center.getLat()).toBe(37.512);
});

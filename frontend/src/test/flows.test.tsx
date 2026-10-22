import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { AuthPage } from "../features/auth/AuthPage";
import { DashboardEditor } from "../features/dashboard/DashboardEditor";
import { WeatherWidget } from "../features/weather/WeatherWidget";
import { MyPage } from "../features/profile/MyPage";
import { useSession } from "../lib/store";
import { api } from "../lib/api";
import type { Dashboard } from "../types";
import type { ReactNode } from "react";
vi.mock("../lib/api", async () => {
  const actual = await vi.importActual("../lib/api");
  return { ...actual, api: vi.fn() };
});
function wrapper(child: ReactNode) {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter>{child}</MemoryRouter>
    </QueryClientProvider>,
  );
}
const dashboard: Dashboard = {
  version: 0,
  widgets: [
    {
      id: "weather",
      type: "weather",
      enabled: true,
      order: 0,
      size: "MEDIUM",
      settings: {},
    },
    {
      id: "news",
      type: "news",
      enabled: true,
      order: 1,
      size: "LARGE",
      settings: {},
    },
  ],
};
beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  useSession.setState({ token: null, user: null, ready: true });
});
describe("핵심 UI 흐름", () => {
  it("로그인 오류는 사용자 안내로 표시한다", async () => {
    vi.mocked(api).mockRejectedValue(
      new Error("이메일 또는 비밀번호를 확인해 주세요."),
    );
    wrapper(<AuthPage />);
    const u = userEvent.setup();
    await u.type(screen.getByLabelText("이메일"), "me@example.com");
    await u.type(screen.getByLabelText("비밀번호"), "wrong-password");
    await u.click(screen.getByRole("button", { name: "로그인" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("비밀번호");
  });
  it("날씨 로딩은 카드 skeleton으로 표시한다", () => {
    vi.mocked(api).mockReturnValue(new Promise(() => {}));
    wrapper(<WeatherWidget />);
    expect(
      screen.getByRole("status", { name: "정보 불러오는 중" }),
    ).toBeVisible();
  });
  it("위젯 오류는 개별 retry를 제공한다", async () => {
    vi.mocked(api).mockRejectedValue(new Error("upstream"));
    wrapper(<WeatherWidget />);
    expect(await screen.findByRole("alert")).toHaveTextContent("불러오지");
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeVisible();
  });
  it("날씨의 핵심 수치와 샘플 출처를 표시한다", async () => {
    vi.mocked(api).mockResolvedValue({
      temperature: 21,
      feelsLike: 20,
      high: 24,
      low: 16,
      condition: "맑음",
      humidity: 52,
      precipitation: 10,
      meta: {
        mode: "DEMO",
        provider: "sample",
        updatedAt: new Date().toISOString(),
      },
    });
    wrapper(<WeatherWidget />);
    expect(await screen.findByText("서울 · 맑음")).toBeVisible();
    expect(screen.getByText("샘플 데이터 · 실제 API 미호출")).toBeVisible();
  });
  it("모바일 이동 버튼과 삭제로 구성을 저장한다", async () => {
    wrapper(<DashboardEditor dashboard={dashboard} close={vi.fn()} />);
    const u = userEvent.setup();
    await u.click(
      screen.getByRole("button", { name: "오늘의 뉴스 위로 이동" }),
    );
    await u.click(screen.getByRole("button", { name: "오늘의 날씨 삭제" }));
    await u.click(screen.getByRole("button", { name: "이 구성으로 저장" }));
    await waitFor(() =>
      expect(
        JSON.parse(localStorage.getItem("db-guest-dashboard")!).widgets.map(
          (w: { type: string }) => w.type,
        ),
      ).toEqual(["news"]),
    );
  });
  it("편집 취소는 저장된 구성을 바꾸지 않는다", async () => {
    const close = vi.fn();
    wrapper(<DashboardEditor dashboard={dashboard} close={close} />);
    await userEvent.click(
      screen.getByRole("button", { name: "오늘의 날씨 삭제" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(close).toHaveBeenCalled();
    expect(localStorage.getItem("db-guest-dashboard")).toBeNull();
  });
  it("게스트 My는 로그인 강제 redirect 없이 진입점을 제공한다", () => {
    wrapper(<MyPage />);
    expect(screen.getByRole("link", { name: "로그인" })).toHaveAttribute(
      "href",
      "/login",
    );
    expect(
      screen.getByRole("link", { name: "화면 스타일 설정" }),
    ).toBeVisible();
  });
});

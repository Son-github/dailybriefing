import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { PlaceInput } from "../features/transit/PlaceInput";
import { EventEditor } from "../features/calendar/EventEditor";
import { UpcomingWidget } from "../features/calendar/UpcomingWidget";
import {
  dayLabel,
  seoulToday,
  monthRange,
  validDate,
} from "../features/calendar/dates";
import { api } from "../lib/api";
import { useSession } from "../lib/store";
import type { ReactNode } from "react";
vi.mock("../lib/api", async () => ({
  ...(await vi.importActual("../lib/api")),
  api: vi.fn(),
}));
function wrap(child: ReactNode) {
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter>{child}</MemoryRouter>
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  vi.resetAllMocks();
  useSession.setState({ user: null, token: null, ready: true });
});
describe("개인화 UI", () => {
  it("서울 자정과 윤년 날짜는 UTC 변환으로 전날이 되지 않는다", () => {
    expect(seoulToday(new Date("2026-10-05T15:01:00Z"))).toBe("2026-10-06");
    expect(monthRange("2028-02").to).toBe("2028-02-29");
    expect(dayLabel(0)).toBe("D-Day");
    expect(dayLabel(5)).toBe("D-5");
    expect(validDate("2026-99-99")).toBe(false);
    expect(validDate("2028-02-29")).toBe(true);
  });
  it("장소 자동완성에서 키보드로 주소까지 확인해 선택한다", async () => {
    const place = {
      id: "a",
      name: "성복",
      address: "신분당선",
      latitude: 37.3,
      longitude: 127.0,
      source: "SEARCH",
      category: null,
    };
    vi.mocked(api).mockResolvedValue([place]);
    const change = vi.fn();
    wrap(<PlaceInput label="출발지" value={null} onChange={change} />);
    const u = userEvent.setup();
    await u.type(screen.getByRole("combobox"), "성복");
    expect(await screen.findByRole("option")).toHaveTextContent("신분당선");
    await u.keyboard("{ArrowDown}{Enter}");
    expect(change).toHaveBeenCalledWith(place);
  });
  it("일정 저장 실패는 작성한 제목을 유지한다", async () => {
    vi.mocked(api).mockRejectedValue(new Error("잠시 후 다시 시도해 주세요."));
    wrap(<EventEditor event={null} date="2026-10-06" close={vi.fn()} />);
    const u = userEvent.setup();
    await u.type(screen.getByLabelText("일정 제목"), "중요한 약속");
    await u.click(screen.getByRole("button", { name: "일정 저장" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("다시 시도");
    expect(screen.getByLabelText("일정 제목")).toHaveValue("중요한 약속");
  });
  it("게스트 개인 일정은 로그인 진입점을 제공하고 인증 API를 호출하지 않는다", () => {
    wrap(<UpcomingWidget />);
    expect(
      screen.getByRole("link", { name: "로그인하고 일정 저장" }),
    ).toHaveAttribute("href", "/login");
    expect(api).not.toHaveBeenCalled();
  });
});

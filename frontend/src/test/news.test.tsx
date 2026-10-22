import { beforeEach, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { waitFor as waitForUI } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { NewsWidget } from "../features/news/NewsWidget";
import { NewsPage } from "../features/news/NewsPage";
import { api, ApiError } from "../lib/api";
import { useSession } from "../lib/store";
import {
  newsCategories,
  type NewsPageData,
  type NewsSections,
} from "../features/news/model";
vi.mock("../lib/api", async (original) => ({
  ...(await original<typeof import("../lib/api")>()),
  api: vi.fn(),
}));
const meta = {
  provider: "NAVER 뉴스 검색",
  mode: "LIVE" as const,
  updatedAt: "2026-10-06T01:00:00Z",
};
function page(category: string, start = 1, display = 5): NewsPageData {
  return {
    category: category as NewsPageData["category"],
    hasMore: true,
    nextStart: start + display,
    meta,
    items: Array.from({ length: display }, (_, i) => ({
      id: `${category}-${start + i}`,
      title: `${category} 기사 ${start + i}`,
      source: "example.com",
      publishedAt: "2026-10-06T00:00:00Z",
      summary: "제공된 설명",
      url: "https://example.com/article",
      category,
    })),
  };
}
function sections(): NewsSections {
  return Object.fromEntries(
    newsCategories.map((c) => [c.key, { ...page(c.value), error: null }]),
  ) as NewsSections;
}
function mount(component: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{component}</MemoryRouter>
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  vi.mocked(api).mockReset();
  useSession.getState().setSession(null, null);
});
it("처음에는 선택한 분야 5개만 보이고 탭 전환은 API 호출이 없다", async () => {
  vi.mocked(api).mockResolvedValue(sections());
  mount(<NewsWidget />);
  await screen.findByText("IT 기사 1");
  expect(document.querySelectorAll(".news-article")).toHaveLength(5);
  await userEvent.click(screen.getByRole("tab", { name: "경제" }));
  expect(screen.getByText("ECONOMY 기사 1")).toBeVisible();
  expect(screen.queryByText("IT 기사 1")).toBeNull();
  expect(api).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("link", { name: "전체 뉴스 보기" })).toHaveAttribute(
    "href",
    "/news?category=ECONOMY",
  );
  expect(screen.getByRole("link", { name: "NAVER API HUB" })).toHaveAttribute(
    "rel",
    "noopener noreferrer",
  );
});
it("더 보기는 start6/display10으로 추가하고 탭 복귀에도 결과를 유지한다", async () => {
  vi.mocked(api).mockImplementation(async (path) =>
    path === "/news/sections" ? sections() : page("IT", 6, 10),
  );
  mount(<NewsPage />);
  await screen.findByText("IT 기사 1");
  await userEvent.click(screen.getByRole("button", { name: "더 보기" }));
  await screen.findByText("IT 기사 15");
  expect(document.querySelectorAll(".news-article")).toHaveLength(15);
  expect(vi.mocked(api).mock.calls[1][0]).toBe(
    "/news?category=IT&start=6&display=10",
  );
  await userEvent.click(screen.getByRole("tab", { name: "스포츠" }));
  expect(screen.getByText("SPORTS 기사 1")).toBeVisible();
  await userEvent.click(screen.getByRole("tab", { name: "IT" }));
  expect(screen.getByText("IT 기사 15")).toBeVisible();
  expect(api).toHaveBeenCalledTimes(2);
});
it("일부 분야 오류는 다른 분야를 유지하고 재시도는 실패한 분야만 조회한다", async () => {
  const data = sections();
  data.society = {
    ...data.society,
    items: [],
    error: {
      status: 503,
      code: "PROVIDER_LIMIT",
      message: "제한",
      requestId: "news-req",
    },
  };
  vi.mocked(api).mockImplementation(async (path) =>
    path === "/news/sections" ? data : page("SOCIETY"),
  );
  mount(<NewsWidget />);
  await screen.findByText("IT 기사 1");
  await userEvent.click(screen.getByRole("tab", { name: "사회" }));
  expect(screen.getByText("사회 뉴스를 불러오지 못했어요.")).toBeVisible();
  await userEvent.click(screen.getByRole("button", { name: "다시 시도" }));
  await screen.findByText("SOCIETY 기사 1");
  expect(vi.mocked(api).mock.calls[1][0]).toBe(
    "/news?category=SOCIETY&start=1&display=5",
  );
  await userEvent.click(screen.getByRole("tab", { name: "IT" }));
  expect(screen.getByText("IT 기사 1")).toBeVisible();
  expect(api).toHaveBeenCalledTimes(2);
});
it("더 보기 실패는 기존 기사를 지우지 않고 같은 offset으로 재시도한다", async () => {
  vi.mocked(api)
    .mockResolvedValueOnce(sections())
    .mockRejectedValueOnce(new ApiError(504, "TIMEOUT", "timeout"));
  mount(<NewsPage />);
  await screen.findByText("IT 기사 1");
  await userEvent.click(screen.getByRole("button", { name: "더 보기" }));
  await screen.findByText(/추가 뉴스를 불러오지 못했어요/);
  expect(document.querySelectorAll(".news-article")).toHaveLength(5);
  vi.mocked(api).mockResolvedValueOnce({
    ...page("IT", 6, 2),
    hasMore: false,
    nextStart: null,
  });
  await userEvent.click(
    screen.getByRole("button", { name: "더 보기 다시 시도" }),
  );
  await screen.findByText("IT 기사 7");
  expect(vi.mocked(api).mock.calls[2][0]).toBe(
    "/news?category=IT&start=6&display=10",
  );
  expect(screen.queryByRole("button", { name: "더 보기" })).toBeNull();
});
it("초기 Skeleton과 빈 결과, 키보드 탭 선택을 제공한다", async () => {
  let finish!: (value: NewsSections) => void;
  vi.mocked(api).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  mount(<NewsWidget />);
  expect(
    screen.getByRole("status", { name: "뉴스를 불러오는 중" }),
  ).toBeVisible();
  const data = sections();
  data.economy = {
    ...data.economy,
    items: [],
    hasMore: false,
    nextStart: null,
  };
  finish(data);
  await screen.findByText("IT 기사 1");
  screen.getByRole("tab", { name: "IT" }).focus();
  await userEvent.keyboard("{ArrowRight}");
  await waitForUI(() =>
    expect(screen.getByRole("tab", { name: "경제" })).toHaveAttribute(
      "aria-selected",
      "true",
    ),
  );
  expect(screen.getByText(/이 분야의 검색 결과가 아직 없어요/)).toBeVisible();
  expect(api).toHaveBeenCalledTimes(1);
});

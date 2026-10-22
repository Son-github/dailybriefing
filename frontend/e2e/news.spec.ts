import { test, expect } from "@playwright/test";
const labels: Record<string, string> = {
  IT: "IT",
  ECONOMY: "경제",
  SOCIETY: "사회",
  WORLD: "국제",
  SPORTS: "스포츠",
};
function fixturePage(category: string, start = 1, display = 5) {
  return {
    category,
    items: Array.from({ length: display }, (_, i) => ({
      id: `${category}-${start + i}`,
      title: `${labels[category]} 샘플 뉴스 ${start + i}`,
      summary: "뉴스 조회와 오류 복구를 검증하는 테스트 기사입니다.",
      source: "샘플 기사",
      publishedAt: "2026-10-20T00:00:00Z",
      url: null,
      originalUrl: null,
      providerUrl: null,
      category,
    })),
    hasMore: true,
    nextStart: start + display,
    meta: {
      provider: "테스트 뉴스",
      mode: "DEMO",
      updatedAt: "2026-10-20T00:00:00Z",
    },
  };
}
function fixtureSections() {
  return Object.fromEntries(
    ["IT", "ECONOMY", "SOCIETY", "WORLD", "SPORTS"].map((category) => [
      category.toLowerCase(),
      { ...fixturePage(category), error: null },
    ]),
  );
}
// LIVE 설정에서도 테스트가 실제 공급자 쿼터를 사용하지 않도록 API를 전부 모의합니다.
test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/**", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/auth/refresh"))
      return route.fulfill({ status: 401, json: { code: "UNAUTHORIZED" } });
    if (url.pathname.endsWith("/news/sections"))
      return route.fulfill({ json: fixtureSections() });
    if (url.pathname.endsWith("/news"))
      return route.fulfill({
        json: fixturePage(
          url.searchParams.get("category") || "IT",
          Number(url.searchParams.get("start") || 1),
          Number(url.searchParams.get("display") || 5),
        ),
      });
    return route.fulfill({ json: [] });
  });
});
test("카테고리5개, 탭 무호출, 분야별 더보기와 복귀", async ({ page }, info) => {
  let sectionsCalls = 0;
  const pages: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname === "/api/v1/news/sections") sectionsCalls++;
    else if (url.pathname === "/api/v1/news") pages.push(url.search);
  });
  await page.goto("/news");
  await expect(page.locator(".news-article")).toHaveCount(5);
  await expect(page.getByRole("tab")).toHaveCount(5);
  await expect(
    page.getByRole("tab", { name: "IT", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "경제", exact: true }).click();
  await expect(page.locator(".news-article").first()).toContainText("경제");
  expect(sectionsCalls).toBe(1);
  expect(pages).toHaveLength(0);
  await page.getByRole("button", { name: "더 보기", exact: true }).click();
  await expect(page.locator(".news-article")).toHaveCount(15);
  expect(pages).toEqual(["?category=ECONOMY&start=6&display=10"]);
  await page.getByRole("tab", { name: "사회", exact: true }).click();
  await expect(page.locator(".news-article")).toHaveCount(5);
  await page.getByRole("tab", { name: "경제", exact: true }).click();
  await expect(page.locator(".news-article")).toHaveCount(15);
  expect(sectionsCalls).toBe(1);
  expect(pages).toHaveLength(1);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  expect(overflow).toBe(false);
  await page.getByRole("tab", { name: "IT", exact: true }).click();
  await expect(page.locator(".news-article")).toHaveCount(5);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("heading", { name: "세상을 읽는 시간." }).click();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollHeight))
    .toBeLessThan(1600);
  await page.screenshot({
    path: `../docs/assets/news-${info.project.name}.png`,
    fullPage: true,
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await page
      .locator(".news-list")
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
});
test("부분 오류는 성공 분야를 유지하고 실패 분야만 재시도", async ({
  page,
}) => {
  await page.route("**/api/v1/news/sections", async (route) => {
    const data = fixtureSections();
    data.society = {
      ...data.society,
      items: [],
      error: {
        status: 504,
        code: "TIMEOUT",
        message: "timeout",
        requestId: "news-partial",
      },
    };
    await route.fulfill({ json: data });
  });
  let retry = 0;
  page.on("request", (r) => {
    if (r.url().includes("/api/v1/news?category=SOCIETY&start=1&display=5"))
      retry++;
  });
  await page.goto("/news");
  await expect(page.locator(".news-article")).toHaveCount(5);
  await page.getByRole("tab", { name: "사회", exact: true }).click();
  await expect(page.getByText("사회 뉴스를 불러오지 못했어요.")).toBeVisible();
  await page.getByRole("button", { name: "문제 해결 방법" }).click();
  await expect(
    page.getByRole("dialog").getByText("news-partial", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "확인", exact: true }).click();
  await page.getByRole("button", { name: "다시 시도", exact: true }).click();
  await expect(page.locator(".news-article")).toHaveCount(5);
  expect(retry).toBe(1);
  await page.getByRole("tab", { name: "IT", exact: true }).click();
  await expect(page.locator(".news-article").first()).toContainText("IT");
});

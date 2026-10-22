import { test, expect } from "@playwright/test";
test("백엔드 없이 정적 DEMO가 조회·편집·뉴스·이동·캘린더를 제공한다", async ({
  page,
}) => {
  let apiCalls = 0;
  await page.route("**/runtime-config.json", (route) =>
    route.fulfill({
      json: {
        schemaVersion: 1,
        mode: "STATIC_DEMO",
        liveEnabled: false,
        apiBase: "/api/v1",
        kakaoMapKey: "",
      },
    }),
  );
  await page.route("**/api/**", (route) => {
    apiCalls++;
    return route.abort();
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /당신의 하루/ }),
  ).toBeVisible();
  await expect(
    page.getByText("샘플 데이터 · 실제 API 미호출").first(),
  ).toBeVisible();
  await page.getByRole("button", { name: /편집/ }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await page.goto("/news");
  await expect(page.locator(".news-article")).toHaveCount(5);
  await page.getByRole("button", { name: "더 보기", exact: true }).click();
  await expect(page.locator(".news-article")).toHaveCount(15);
  await page.goto("/transit");
  await page
    .getByRole("combobox", { name: "출발지", exact: true })
    .fill("서울역");
  await page.getByRole("option", { name: /서울역/ }).click();
  await page
    .getByRole("combobox", { name: "도착지", exact: true })
    .fill("강남역");
  await page.getByRole("option", { name: /강남역/ }).click();
  await page.getByRole("button", { name: "경로 찾기", exact: true }).click();
  await expect(page.locator(".route-card")).toHaveCount(1);
  await expect(page.getByText(/정적 DEMO의 허구 경로/)).toBeVisible();
  await page.goto("/calendar");
  await page.getByRole("button", { name: /달력 체험용 샘플 날짜/ }).click();
  await expect(page.locator(".agenda-card .holiday-label")).toContainText(
    "달력 체험용 샘플 날짜",
  );
  await page.goto("/signup");
  await expect(
    page.getByRole("heading", { name: "지금은 샘플 체험 중이에요" }),
  ).toBeVisible();
  expect(apiCalls).toBe(0);
});
test("LIVE health 실패는 샘플 자동 대체 없이 명시적 체험 전환을 제공한다", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/runtime-config.json", (route) =>
    route.fulfill({
      json: {
        schemaVersion: 1,
        mode: "LIVE",
        liveEnabled: true,
        apiBase: "/api/v1",
        kakaoMapKey: "",
      },
    }),
  );
  await page.route("**/api/**", (route) => {
    calls++;
    return route.abort();
  });
  await page.goto("/");
  await expect(
    page.getByText("LIVE 연결 확인 실패 · 샘플로 자동 대체하지 않았어요"),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "확인", exact: true }).click();
  expect(calls).toBe(1);
  await page.getByRole("button", { name: "샘플 체험", exact: true }).click();
  await expect(
    page.getByText("샘플 데이터 · 실제 API 미호출").first(),
  ).toBeVisible();
  expect(calls).toBe(1);
});

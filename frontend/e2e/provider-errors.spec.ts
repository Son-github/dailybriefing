import { test, expect } from "@playwright/test";
test("카카오 서비스 비활성화는 코드와 원인, 활성화 방법을 보여준다", async ({
  page,
}) => {
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/auth/refresh"))
      return route.fulfill({ status: 401, json: { code: "UNAUTHORIZED" } });
    if (url.pathname.endsWith("/auth/csrf"))
      return route.fulfill({ json: { token: "fixture-token" } });
    if (url.pathname.endsWith("/mobility/places")) {
      const name = url.searchParams.get("query") || "장소";
      return route.fulfill({
        json: [
          {
            id: name,
            name,
            address: "서울",
            latitude: name === "서울역" ? 37.55 : 37.49,
            longitude: 127,
            source: "SEARCH",
            category: null,
          },
        ],
      });
    }
    if (url.pathname.endsWith("/mobility/routes"))
      return route.fulfill({
        status: 502,
        json: {
          code: "KAKAO_MAP_DISABLED",
          message: "공급자 연결 오류",
          requestId: "route-disabled-403",
          details: { provider: "KakaoMapTransit", upstreamStatus: 403 },
        },
      });
    return route.fulfill({ json: [] });
  });
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
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "카카오맵 사용 설정이 꺼져 있어요" }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText("OPEN_MAP_AND_LOCAL");
  await expect(page.getByRole("dialog")).toContainText("사용 설정을 ON");
  await expect(page.getByRole("dialog")).toContainText("route-disabled-403");
  await page.getByRole("button", { name: "확인", exact: true }).click();
  await expect(page.locator(".route-results")).toContainText(
    "KAKAO_MAP_DISABLED",
  );
  await expect(page.locator(".route-results")).toContainText("HTTP 403");
});

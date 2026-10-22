import { test, expect } from "@playwright/test";
test("직접 메뉴, 네이비 테마, 카드 정렬과 작은 화면", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const nav = page.getByRole("navigation", {
    name: info.project.name === "mobile" ? "모바일 주 메뉴" : "주 메뉴",
    exact: true,
  });
  for (const name of ["홈", "이동", "일정", "뉴스", "마이"])
    await expect(nav.getByRole("link", { name, exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "둘러보기", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "오늘의 날씨", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "다크 테마로 변경" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  expect(
    await page
      .locator("html")
      .evaluate((el) => getComputedStyle(el).getPropertyValue("--bg").trim()),
  ).toBe("#0b1220");
  const cards = await page
    .locator(".dashboard-grid > .widget")
    .evaluateAll((nodes) =>
      nodes.slice(0, 2).map((node) => {
        const box = node.getBoundingClientRect();
        return { y: box.y, height: box.height, x: box.x };
      }),
    );
  if (info.project.name === "desktop") {
    expect(cards[0].y).toBe(cards[1].y);
    expect(cards[0].height).toBe(cards[1].height);
  }
  await expect(
    page.getByRole("button", { name: "편집", exact: true }),
  ).toBeEnabled();
  await expect(page.locator(".news-article")).toHaveCount(5);
  await expect
    .poll(() =>
      page
        .locator(".button.secondary")
        .first()
        .evaluate((el) => getComputedStyle(el).backgroundColor),
    )
    .toBe("rgb(17, 29, 50)");
  await page.screenshot({
    path: `../docs/assets/dashboard-navy-${info.project.name}.png`,
    fullPage: true,
  });
  await nav.getByRole("link", { name: "뉴스", exact: true }).click();
  await expect(page).toHaveURL(/\/news/);
  await expect(page.locator(".news-article")).toHaveCount(5);
  await page.screenshot({
    path: `../docs/assets/news-navy-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "라이트 테마로 변경" }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.setViewportSize({ width: 320, height: 800 });
  for (const path of [
    "/",
    "/news",
    "/calendar",
    "/transit",
    "/my",
    "/settings",
  ]) {
    await page.goto(path);
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
  }
  await page.goto("/explore");
  await expect(page).toHaveURL(/\/$/);
});

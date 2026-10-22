import { test, expect } from "@playwright/test";
test("샘플 출처와 브라우저 조회 로그 및 요청번호를 표시한다", async ({ page }) => {
  const logs: string[] = [];
  page.on("console", message => {
    if (message.text().startsWith("[Daily Briefing] 데이터 조회")) logs.push(message.text());
  });
  const weatherResponse = page.waitForResponse(response => new URL(response.url()).pathname === "/api/v1/weather");
  await page.goto("/");
  const response = await weatherResponse;
  expect(response.headers()["x-data-mode"]).toBe("DEMO");
  expect(response.headers()["x-data-result"]).toBe("SUCCESS");
  expect(response.headers()["x-request-id"]).toBeTruthy();
  await expect(page.getByText("샘플 데이터 · 실제 API 미호출").first()).toBeVisible();
  await expect.poll(() => logs.some(log => log.includes("/weather") && log.includes("데이터 수신 완료") && log.includes("외부 API 미호출"))).toBe(true);
});

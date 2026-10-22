import { test, expect } from "@playwright/test";
test("guest dashboard 편집·순서·새로고침과 responsive layout", async ({
  page,
}, info) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "오늘의 날씨" }),
  ).toBeVisible();
  await expect(page.getByText("샘플 데이터").first()).toBeVisible();
  const grid = page.locator(".dashboard-grid");
  const columns = await grid.evaluate(
    (el) => getComputedStyle(el).gridTemplateColumns.split(" ").length,
  );
  expect(columns).toBe(info.project.name === "mobile" ? 1 : 2);
  await page.getByRole("button", { name: "편집", exact: true }).click();
  await page.getByRole("button", { name: "오늘의 날씨 삭제" }).click();
  await page.getByRole("button", { name: "환율 아래로 이동" }).click();
  await page.getByRole("button", { name: "환율 위로 이동" }).click();
  await page.getByRole("button", { name: "이 구성으로 저장" }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "환율", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "오늘의 날씨" })).toHaveCount(
    0,
  );
  await expect(page.locator("body")).toHaveJSProperty(
    "scrollWidth",
    await page.evaluate(() => innerWidth),
  );
});
test("signup → onboarding → 이동·일정 저장 → refresh → 재로그인 → 탈퇴", async ({
  page,
}, info) => {
  const email = `e2e-${info.project.name}-${Date.now()}@example.com`;
  await page.goto("/signup");
  await page.getByLabel("닉네임").fill("브리핑");
  await page.getByLabel("이메일", { exact: true }).fill(email);
  await page.getByLabel("비밀번호", { exact: true }).fill("test-password-123");
  await page.getByRole("button", { name: "회원가입", exact: true }).click();
  await expect(page).toHaveURL(/onboarding/);
  await page.getByRole("button", { name: "부산", exact: true }).click();
  await page.getByRole("button", { name: "다음", exact: true }).click();
  await page.getByRole("button", { name: "다음", exact: true }).click();
  await page.getByRole("button", { name: "내 브리핑 시작하기" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/transit");
  await page
    .getByRole("combobox", { name: "출발지", exact: true })
    .fill("성복");
  await page.getByRole("option", { name: /성복/ }).click();
  await page
    .getByRole("combobox", { name: "도착지", exact: true })
    .fill("강남");
  await page.getByRole("option", { name: /강남/ }).click();
  await page.getByRole("button", { name: "출발지와 도착지 바꾸기" }).click();
  await expect(
    page.getByRole("combobox", { name: "출발지", exact: true }),
  ).toHaveValue("강남역");
  await page.getByRole("button", { name: "출발지와 도착지 바꾸기" }).click();
  await page.getByRole("button", { name: "경로 찾기", exact: true }).click();
  await expect(page.locator(".route-card")).toHaveCount(1);
  await expect(
    page.getByText("UI 체험용 예시예요.", { exact: false }),
  ).toBeVisible();
  await page.screenshot({
    path: `../docs/assets/transit-${info.project.name}.png`,
    fullPage: info.project.name === "desktop",
  });
  await page.getByRole("button", { name: "경로 저장", exact: true }).click();
  await page.getByLabel("경로 이름").fill("출근길");
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.getByRole("button", { name: "저장됨" })).toBeVisible();
  await expect(page.locator(".route-card")).toHaveCount(1);
  await expect(
    page.locator(".favorite-main").filter({ hasText: "출근길" }),
  ).toBeVisible();
  await page.goto("/calendar");
  await page.getByRole("button", { name: "일정 추가", exact: true }).click();
  await page.getByLabel("일정 제목").fill("내 중요한 약속");
  await page.getByLabel("장소 · 선택").fill("서울");
  await page.getByRole("button", { name: "일정 저장", exact: true }).click();
  await expect(
    page.locator(".event-button").filter({ hasText: "내 중요한 약속" }),
  ).toBeVisible();
  await page
    .locator(".event-button")
    .filter({ hasText: "내 중요한 약속" })
    .click();
  await page.getByLabel("일정 제목").fill("수정한 약속");
  await page.getByRole("button", { name: "일정 저장", exact: true }).click();
  await page.goto("/");
  await expect(page.getByText("수정한 약속", { exact: true })).toBeVisible();
  await expect(page.getByText("D-Day", { exact: true })).toBeVisible();
  await page.screenshot({
    path: `../docs/assets/personal-dashboard-${info.project.name}.png`,
    fullPage: info.project.name === "desktop",
  });
  await page.goto("/calendar");
  await expect(
    page.locator(".event-button").filter({ hasText: "수정한 약속" }),
  ).toBeVisible();
  await page.screenshot({
    path: `../docs/assets/calendar-${info.project.name}.png`,
    fullPage: info.project.name === "desktop",
  });
  await page.goto("/my");
  await page.getByLabel("닉네임").fill("나의하루");
  await page.getByRole("button", { name: "내 취향 저장" }).click();
  await expect(page.getByRole("status")).toContainText("내 취향을 저장");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "나의하루 님의 공간." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "다크", exact: true }).click();
  await page.getByRole("button", { name: "테마 설정 저장" }).click();
  await expect(
    page.getByText("기기 간에 테마 설정을 저장했어요."),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveClass("dark");
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).some((k) => /token/i.test(k)),
    ),
  ).toBe(false);
  await page.getByRole("button", { name: "로그아웃", exact: true }).click();
  await page.goto("/login");
  await page.getByLabel("이메일", { exact: true }).fill(email);
  await page.getByLabel("비밀번호", { exact: true }).fill("test-password-123");
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page.getByText("수정한 약속", { exact: true })).toBeVisible();
  await page.goto("/transit");
  await expect(
    page.locator(".favorite-main").filter({ hasText: "출근길" }),
  ).toBeVisible();
  await page.goto("/calendar");
  await page
    .locator(".event-button")
    .filter({ hasText: "수정한 약속" })
    .click();
  await page.getByRole("button", { name: "일정 삭제", exact: true }).click();
  await page
    .getByRole("button", { name: "일정 삭제 확인", exact: true })
    .click();
  await expect(page.locator(".event-button")).toHaveCount(0);
  await page.goto("/my");
  await page.getByRole("button", { name: "회원 탈퇴", exact: true }).click();
  await page.getByLabel("비밀번호로 확인").fill("test-password-123");
  await page.getByRole("button", { name: "계정과 모든 정보 삭제" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/my");
  await expect(
    page.getByRole("heading", { name: "나만의 하루를 저장해요." }),
  ).toBeVisible();
});
test("weather 실패는 다른 위젯과 분리된다", async ({ page }) => {
  await page.route("**/api/v1/weather?*", (route) =>
    route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({
        code: "UPSTREAM_ERROR",
        message: "upstream",
        requestId: "e2e-weather-failure",
      }),
    }),
  );
  await page.goto("/");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("dialog").getByText("e2e-weather-failure"),
  ).toBeVisible();
  await page.getByRole("button", { name: "확인", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "문제 해결 방법" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "다시 시도" })).toBeVisible();
  await expect(page.getByText("USD", { exact: true }).first()).toBeVisible();
  await expect(page.locator(".news-article").first()).toBeVisible();
});
test("portfolio screenshots", async ({ page }, info) => {
  await page.goto("/");
  await expect(page.getByText("샘플 데이터").first()).toBeVisible();
  await page.screenshot({
    path: `../docs/assets/dashboard-${info.project.name}.png`,
    fullPage: info.project.name === "desktop",
  });
  await page.getByRole("button", { name: "편집", exact: true }).click();
  await page.screenshot({
    path: `../docs/assets/editor-${info.project.name}.png`,
    fullPage: info.project.name === "desktop",
  });
});

test("keyboard editor, focus return, small viewport, news and settings", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "편집", exact: true }).click();
  const handle = page.getByRole("button", {
    name: "오늘의 날씨 드래그하여 순서 변경",
  });
  const nextId = await page
    .locator(".edit-row")
    .nth(1)
    .getAttribute("data-widget-id");
  await handle.focus();
  await page.keyboard.press("Space");
  await expect(handle).toHaveAttribute("aria-pressed", "true");
  // dnd-kit installs the keyboard listener after activation and measures rows on the next frame.
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  await page.keyboard.press("ArrowDown");
  await expect(page.locator("[id^=DndLiveRegion]")).toContainText(
    `was moved over droppable area ${nextId}`,
  );
  await page.keyboard.press("Space");
  await expect(page.locator(".edit-title").first()).toContainText("이동");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "편집", exact: true }),
  ).toBeFocused();
  await page.setViewportSize({ width: 320, height: 740 });
  for (const route of [
    "/",
    "/news",
    "/transit",
    "/calendar",
    "/my",
    "/settings",
    "/login",
    "/signup",
  ]) {
    await page.goto(route);
    await expect(page.locator("#main")).toBeVisible();
    await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 320);
  }
  await page.goto("/settings");
  await page.getByRole("button", { name: "시스템", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "시스템", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("GPS origin, single shortest route, denied permission fallback", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 37.5665, longitude: 126.978 });
  await page.goto("/transit");
  await page.getByRole("button", { name: "현재 위치", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "출발지", exact: true }),
  ).toHaveValue("현재 위치");
  await page
    .getByRole("combobox", { name: "도착지", exact: true })
    .fill("코엑스");
  await page.getByRole("option", { name: /코엑스/ }).click();
  await expect(
    page.getByRole("button", { name: "출발 시간 선택", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "경로 찾기", exact: true }).click();
  await expect(page.locator(".route-card")).toHaveCount(1);
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "geolocation", {
      value: {
        getCurrentPosition: (
          _success: unknown,
          failure: (error: { code: number }) => void,
        ) => failure({ code: 1 }),
      },
    }),
  );
  await page.reload();
  await page.getByRole("button", { name: "현재 위치", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "위치 권한이 꺼져 있어요" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "확인", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "출발지", exact: true }),
  ).toBeVisible();
});

test("지도 SDK 모의 클릭 위치가 같은 Place로 경로 검색된다", async ({
  page,
}) => {
  // 실제 SDK/키를 사용한 검증이 아닙니다. Provider contract를 모의해 좌표 전달을 검증합니다.
  await page.addInitScript(() => {
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
    class FakeMap {
      center: Coordinate;
      constructor(el: HTMLElement, options: { center: Coordinate }) {
        this.center = options.center;
        el.setAttribute("data-map", "mock");
        el.textContent = "모의 지도 · 위치를 눌러 선택";
      }
      getCenter() {
        return this.center;
      }
      setCenter(point: Coordinate) {
        this.center = point;
      }
    }
    window.kakao = {
      maps: {
        load: (fn) => fn(),
        LatLng: Coordinate,
        Map: FakeMap,
        event: {
          addListener: (_map, type, fn) => {
            if (type === "click")
              document
                .querySelector('[data-map="mock"]')!
                .addEventListener("click", () =>
                  fn({ latLng: new Coordinate(37.512, 127.059) }),
                );
          },
          removeListener: () => {},
        },
      },
    };
  });
  let startSource = "";
  await page.route("**/api/v1/mobility/routes", async (route) => {
    startSource = route.request().postDataJSON().start.source;
    await route.continue();
  });
  await page.goto("/transit");
  await page.getByRole("button", { name: "출발지 지도 선택" }).click();
  await page.locator('[data-map="mock"]').click();
  await expect(
    page.getByText("샘플 위치 · 실제 주소 확인은 LIVE에서 제공"),
  ).toBeVisible();
  await page.getByRole("button", { name: "이 위치로 설정" }).click();
  await expect(
    page.getByRole("combobox", { name: "출발지", exact: true }),
  ).toHaveValue("선택한 위치");
  await page
    .getByRole("combobox", { name: "도착지", exact: true })
    .fill("서울역");
  await page.getByRole("option", { name: /서울역/ }).click();
  await page.getByRole("button", { name: "경로 찾기", exact: true }).click();
  await expect(page.locator(".route-card")).toHaveCount(1);
  expect(startSource).toBe("MAP");
});
test("로그인 실패는 해결 방법 팝업과 입력값을 유지한다", async ({
  page,
}, info) => {
  await page.goto("/login");
  await page.getByLabel("이메일", { exact: true }).fill("missing@example.com");
  await page.getByLabel("비밀번호", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "로그인 정보를 확인해 주세요" }),
  ).toBeVisible();
  await page.screenshot({
    path: `../docs/assets/error-guide-${info.project.name}.png`,
  });
  await page.getByRole("button", { name: "확인", exact: true }).click();
  await expect(page.getByLabel("이메일", { exact: true })).toHaveValue(
    "missing@example.com",
  );
});

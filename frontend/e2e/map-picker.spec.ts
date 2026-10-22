import { test, expect } from "@playwright/test";
test("지도 검색·주소 선택과 이동 후 핀 정착을 PC와 모바일에서 사용할 수 있다", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    class Point {
      constructor(
        private latitude: number,
        private longitude: number,
      ) {}
      getLat() {
        return this.latitude;
      }
      getLng() {
        return this.longitude;
      }
    }
    const listeners = new Map<string, (e?: { latLng: Point }) => void>();
    class MapView {
      center: Point;
      constructor(el: HTMLElement, options: { center: Point }) {
        this.center = options.center;
        el.style.background =
          "linear-gradient(35deg,transparent 46%,#fff 47%,#fff 53%,transparent 54%),repeating-linear-gradient(90deg,#e3ebe8 0px,#e3ebe8 45px,#fff 46px,#fff 52px)";
        document.addEventListener("test-map-start", () =>
          listeners.get("dragstart")?.(),
        );
        document.addEventListener("test-map-end", () => {
          this.center = new Point(37.512, 127.059);
          listeners.get("idle")?.();
        });
      }
      getCenter() {
        return this.center;
      }
      setCenter(point: Point) {
        this.center = point;
        listeners.get("bounds_changed")?.();
        listeners.get("idle")?.();
      }
    }
    window.kakao = {
      maps: {
        load: (fn) => fn(),
        LatLng: Point,
        Map: MapView,
        event: {
          addListener: (_map, type, fn) => {
            listeners.set(type, fn);
          },
          removeListener: (_map, type) => {
            listeners.delete(type);
          },
        },
      },
    };
  });
  await page.route("**/api/v1/**", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/auth/refresh"))
      return route.fulfill({ status: 401, json: { code: "UNAUTHORIZED" } });
    if (url.pathname.endsWith("/mobility/places"))
      return route.fulfill({
        json: [
          {
            id: "forest",
            name: "서울숲",
            address: "서울 성동구 뚝섬로 273",
            latitude: 37.544,
            longitude: 127.037,
            source: "SEARCH",
            category: null,
          },
        ],
      });
    if (url.pathname.endsWith("/mobility/location")) {
      const moved = Number(url.searchParams.get("latitude")) === 37.512;
      const address = moved
        ? "서울 강남구 영동대로 513"
        : "서울특별시 중구 세종대로 110";
      return route.fulfill({
        json: {
          id: null,
          name: address,
          address,
          latitude: Number(url.searchParams.get("latitude")),
          longitude: Number(url.searchParams.get("longitude")),
          source: "MAP",
          category: null,
        },
      });
    }
    return route.fulfill({ json: [] });
  });
  await page.goto("/transit");
  await page
    .getByRole("button", { name: "도착지 지도 선택", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("서울특별시 중구 세종대로 110")).toBeVisible();
  await expect(dialog.locator(".map-selected-address")).not.toContainText(
    "37.56650",
  );
  await page.evaluate(() =>
    document.dispatchEvent(new Event("test-map-start")),
  );
  await expect(dialog.locator(".map-pin")).toHaveAttribute(
    "data-moving",
    "true",
  );
  await expect(
    dialog.getByRole("button", { name: "이 위치로 설정" }),
  ).toBeDisabled();
  await page.evaluate(() => document.dispatchEvent(new Event("test-map-end")));
  await expect(dialog.getByText("서울 강남구 영동대로 513")).toBeVisible();
  await expect(dialog.locator(".map-pin")).toHaveAttribute(
    "data-moving",
    "false",
  );
  await dialog.getByRole("combobox", { name: "도착지 검색" }).fill("서울숲");
  await dialog.getByRole("option", { name: /서울숲/ }).click();
  await expect(dialog.getByText("서울 성동구 뚝섬로 273")).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "이 위치로 설정" }),
  ).toBeEnabled();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(() =>
      dialog
        .locator(".map-pin-body")
        .evaluate((el) => getComputedStyle(el).animationName),
    )
    .toBe("none");
  await expect(dialog.locator(".map-selected-address")).toBeInViewport({ ratio: 1 });
  await expect(dialog.getByRole("button", {name: "이 위치로 설정"})).toBeInViewport({ ratio: 1 });
  await page.screenshot({
    path: `/tmp/map-picker-${info.project.name}.png`,
    fullPage: false,
  });
  await dialog.getByRole("button", { name: "이 위치로 설정" }).click();
  await expect(
    page.getByRole("combobox", { name: "도착지", exact: true }),
  ).toHaveValue("서울숲");
});

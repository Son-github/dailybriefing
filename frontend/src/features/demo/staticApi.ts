import type { Dashboard, Place } from "../../types";
// 실제 정보가 아닙니다. 정적 DEMO는 서버/외부 API/로그인 없이 동작하고 개인 데이터는 생성하지 않습니다.
export const demoPlaces: Place[] = [
  {
    id: "demo-seoul",
    name: "서울역 · 샘플",
    address: "서울 용산구 한강대로 405 · 샘플 주소",
    latitude: 37.555,
    longitude: 126.971,
    source: "SEARCH",
    category: "샘플",
  },
  {
    id: "demo-gangnam",
    name: "강남역 · 샘플",
    address: "서울 강남구 강남대로 · 샘플 주소",
    latitude: 37.498,
    longitude: 127.028,
    source: "SEARCH",
    category: "샘플",
  },
  {
    id: "demo-coex",
    name: "코엑스 · 샘플",
    address: "서울 강남구 영동대로 513 · 샘플 주소",
    latitude: 37.512,
    longitude: 127.059,
    source: "SEARCH",
    category: "샘플",
  },
];
function meta() {
  return {
    provider: "브라우저 샘플 · 외부 API 미호출",
    mode: "DEMO",
    updatedAt: new Date().toISOString(),
  };
}
function page(category: string, start: number, display: number) {
  const total = 50,
    end = Math.min(start - 1 + display, total);
  const items = Array.from(
    { length: Math.max(0, end - start + 1) },
    (_, i) => ({
      id: `demo-${category}-${start + i}`,
      title: `${category} · 샘플 뉴스 ${start + i}`,
      summary: "실제 기사가 아닌 화면 체험용 샘플입니다.",
      source: "샘플 기사",
      publishedAt: new Date().toISOString(),
      url: null,
      category,
      originalUrl: null,
      providerUrl: null,
    }),
  );
  return {
    category,
    items,
    hasMore: end < total,
    nextStart: end < total ? end + 1 : null,
    meta: meta(),
  };
}
export function staticDemoApi<T>(path: string, init: RequestInit): T {
  const u = new URL(path, "https://demo.invalid"),
    p = u.pathname;
  if (p.startsWith("/auth/") || p.startsWith("/users/") || p.startsWith("/me/"))
    throw new Error("STATIC_DEMO_AUTH");
  let result: unknown;
  if (p === "/dashboard" && (!init.method || init.method === "GET"))
    result = {
      version: 0,
      widgets: (
        ["weather", "transit", "exchange", "calendar", "news"] as const
      ).map((type, order) => ({
        id: `demo-${type}`,
        type,
        enabled: true,
        order,
        size: type === "news" ? "LARGE" : "MEDIUM",
        settings: {},
      })),
    } satisfies Dashboard;
  else if (p === "/weather")
    result = {
      temperature: 21,
      feelsLike: null,
      high: 24,
      low: 16,
      condition: "맑음 · 샘플",
      humidity: 52,
      precipitation: 10,
      meta: meta(),
    };
  else if (p === "/exchange-rates")
    result = {
      rates: [
        {
          currency: "USD",
          currencyName: "미국 달러",
          displayUnit: 1,
          value: 1342.5,
          pair: "USD/KRW",
          change: null,
          changePercent: null,
        },
        {
          currency: "JPY",
          currencyName: "일본 엔",
          displayUnit: 100,
          value: 912,
          pair: "JPY/KRW",
          change: null,
          changePercent: null,
        },
        {
          currency: "EUR",
          currencyName: "유로",
          displayUnit: 1,
          value: 1485.2,
          pair: "EUR/KRW",
          change: null,
          changePercent: null,
        },
      ],
      meta: meta(),
    };
  else if (p === "/briefing")
    result = {
      summaries: ["샘플 데이터로 나만의 대시보드를 구성해 보세요."],
      meta: meta(),
    };
  else if (p === "/news/sections")
    result = Object.fromEntries(
      ["IT", "ECONOMY", "SOCIETY", "WORLD", "SPORTS"].map((c) => [
        c.toLowerCase(),
        { ...page(c, 1, 5), error: null },
      ]),
    );
  else if (p === "/news")
    result = page(
      u.searchParams.get("category") || "IT",
      Number(u.searchParams.get("start") || 1),
      Number(u.searchParams.get("display") || 5),
    );
  else if (p === "/calendar/holidays")
    result = {
      holidays: [
        {
          date: `${u.searchParams.get("year")}-${String(u.searchParams.get("month")).padStart(2, "0")}-01`,
          name: "달력 체험용 샘플 날짜",
          holiday: true,
          type: "SAMPLE",
        },
      ],
      meta: meta(),
    };
  else if (p === "/mobility/places")
    result = demoPlaces.filter((place) =>
      place.name.includes(u.searchParams.get("query") || ""),
    );
  else if (p === "/mobility/location")
    result = {
      ...demoPlaces[0],
      id: null,
      name: "선택한 위치 · 샘플",
      address: "실제 위치를 조회하지 않은 샘플 주소",
      source: "MAP",
      latitude: Number(u.searchParams.get("latitude")),
      longitude: Number(u.searchParams.get("longitude")),
    };
  else if (p === "/mobility/routes" && init.method === "POST")
    result = {
      routes: [
        {
          durationMinutes: 42,
          distanceMeters: 18000,
          transferCount: 1,
          fareWon: 1500,
          summary: "샘플 지하철 → 샘플 버스",
          steps: [
            {
              type: "SUBWAY",
              instruction: "실제 이동에 사용할 수 없는 샘플 경로",
              durationMinutes: 42,
              distanceMeters: 18000,
              vehicleName: "샘플 지하철",
              vehicleType: "SUBWAY",
              startName: "샘플 출발지",
              endName: "샘플 도착지",
              stops: [],
              path: [],
            },
          ],
        },
      ],
      meta: meta(),
      notice: "정적 DEMO의 허구 경로입니다. 실제 이동에 사용하지 마세요.",
    };
  else throw new Error("STATIC_DEMO_UNSUPPORTED");
  return result as T;
}

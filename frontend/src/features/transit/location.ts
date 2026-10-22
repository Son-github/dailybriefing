import { isStaticDemo } from "../../lib/runtime";
import type { Place } from "../../types";
import { ApiError, api } from "../../lib/api";
// GPS는 메모리에만 사용합니다. 사용자가 즐겨찾기 저장을 누르기 전에는 DB에 보내지 않습니다.
export function currentLocation(): Promise<Place> {
  if (isStaticDemo())
    return Promise.resolve({
      id: null,
      name: "현재 위치 · 샘플",
      address: "실제 GPS를 요청하지 않은 샘플 위치",
      latitude: 37.5665,
      longitude: 126.978,
      source: "GPS",
      category: null,
    });
  if (!navigator.geolocation)
    return Promise.reject(
      new ApiError(
        0,
        "LOCATION_UNAVAILABLE",
        "현재 위치 기능을 지원하지 않아요.",
      ),
    );
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          id: null,
          name: "현재 위치",
          address: "경로 검색에만 일시적으로 사용해요.",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          source: "GPS",
          category: null,
        }),
      (error) =>
        reject(
          new ApiError(
            0,
            error.code === 1
              ? "LOCATION_DENIED"
              : error.code === 3
                ? "LOCATION_TIMEOUT"
                : "LOCATION_UNAVAILABLE",
            "현재 위치를 사용할 수 없어요.",
          ),
        ),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    ),
  );
}
export function routeRequest(start: Place, end: Place, signal?: AbortSignal) {
  return api<import("../../types").TransitRoutes>("/mobility/routes", {
    method: "POST",
    body: JSON.stringify({ start, end }),
    signal,
  });
}

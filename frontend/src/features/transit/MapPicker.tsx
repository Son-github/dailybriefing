import { isStaticDemo, runtime } from "../../lib/runtime";
import { StaticMapPicker } from "../demo/StaticMapPicker";
import { useEffect, useRef, useState } from "react";
import { ApiError, api } from "../../lib/api";
import { showError } from "../../lib/errors";
import type { Place } from "../../types";
import { PlaceInput } from "./PlaceInput";
import { Button, Notice, Sheet } from "../../components/ui";
interface Coordinate {
  getLat(): number;
  getLng(): number;
}
interface KakaoMap {
  getCenter(): Coordinate;
  setCenter(p: Coordinate): void;
}
interface Maps {
  load(fn: () => void): void;
  LatLng: new (lat: number, lon: number) => Coordinate;
  Map: new (
    el: HTMLElement,
    options: { center: Coordinate; level: number },
  ) => KakaoMap;
  event: {
    addListener(
      target: KakaoMap,
      type: string,
      fn: (event?: { latLng: Coordinate }) => void,
    ): void;
    removeListener(
      target: KakaoMap,
      type: string,
      fn: (event?: { latLng: Coordinate }) => void,
    ): void;
  };
}
declare global {
  interface Window {
    kakao?: { maps: Maps };
  }
}
let sdk: Promise<Maps> | null = null;
function waitForMap(maps: Maps): Promise<Maps> {
  // SDK 전역 객체가 있어도 지도 엔진은 아직 로드되지 않았을 수 있습니다.
  // 새로 열기/재시도에서도 항상 제한 시간을 두고 CSP 차단을 별도로 안내합니다.
  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      clearTimeout(timeout);
      document.removeEventListener("securitypolicyviolation", blocked);
    };
    const fail = (error: ApiError) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const blocked = (event: SecurityPolicyViolationEvent) => {
      if (
        event.effectiveDirective.startsWith("script-src") &&
        /^https:\/\/t1\.kakaocdn\.net(?:\/|$)/.test(event.blockedURI)
      )
        fail(
          new ApiError(
            0,
            "MAP_SDK_BLOCKED",
            "사이트 보안 설정이 지도 파일을 차단했어요.",
          ),
        );
    };
    const timeout = window.setTimeout(
      () =>
        fail(
          new ApiError(0, "MAP_SDK_TIMEOUT", "지도 초기화가 완료되지 않았어요."),
        ),
      10000,
    );
    document.addEventListener("securitypolicyviolation", blocked);
    try {
      maps.load(() => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(maps);
      });
    } catch {
      fail(
        new ApiError(0, "MAP_SDK_LOAD_FAILED", "카카오 지도 초기화에 실패했어요."),
      );
    }
  });
}
function loadMap(): Promise<Maps> {
  if (window.kakao?.maps) return waitForMap(window.kakao.maps);
  const key =
    runtime().kakaoMapKey ||
    (runtime().mode === "LOCAL" ? import.meta.env.VITE_KAKAO_MAP_KEY : "");
  if (!key)
    return Promise.reject(
      new ApiError(503, "MAP_NOT_CONFIGURED", "지도 연결 설정이 필요해요."),
    );
  if (sdk) return sdk;
  sdk = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => {
      script.remove();
      sdk = null;
      reject(new ApiError(0, "TIMEOUT", "지도 연결이 늦어지고 있어요."));
    }, 10000);
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&autoload=false`;
    script.onload = () => {
      if (!window.kakao) {
        clearTimeout(timeout);
        sdk = null;
        reject(
          new ApiError(
            502,
            "PROVIDER_FORBIDDEN",
            "지도 플랫폼 등록을 확인해 주세요.",
          ),
        );
        return;
      }
      clearTimeout(timeout);
      void waitForMap(window.kakao.maps).then(resolve, (error: ApiError) => {
        script.remove();
        sdk = null;
        reject(error);
      });
    };
    script.onerror = () => {
      clearTimeout(timeout);
      script.remove();
      sdk = null;
      // script.onerror는 공급자의 HTTP 상태/본문을 노출하지 않습니다.
      // 도메인 거절도 같은 이벤트이므로 일반 Backend NETWORK 오류와 구분합니다.
      reject(
        new ApiError(
          0,
          "MAP_SDK_LOAD_FAILED",
          "카카오 지도 SDK를 불러오지 못했어요. 지도 키와 현재 사이트의 도메인 등록을 확인해 주세요.",
        ),
      );
    };
    document.head.append(script);
  });
  return sdk;
}
function ConnectedMapPicker({
  initial,
  select,
  close,
  purpose = "위치",
}: {
  initial: Place | null;
  select: (place: Place) => void;
  close: () => void;
  purpose?: "출발지" | "도착지" | "위치";
}) {
  const element = useRef<HTMLDivElement>(null);
  const pendingSearch = useRef<Place | null>(null);
  const jump = useRef<((place: Place) => void) | null>(null);
  const [searched, setSearched] = useState<Place | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [addressLoading, setAddressLoading] = useState(true);
  const [moving, setMoving] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    let disposed = false;
    let map: KakaoMap | undefined;
    let maps: Maps | undefined;
    let candidate: Place | null = initial;
    let controller: AbortController | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let revision = 0;
    const listeners: {
      type: string;
      fn: (e?: { latLng: Coordinate }) => void;
    }[] = [];
    const invalidate = () => {
      // 이동 시작과 동시에 이전 응답을 무효화합니다. 옛 주소를 새 좌표로 저장하지 않습니다.
      revision++;
      controller?.abort();
      clearTimeout(timer);
      setPlace(null);
      setError("");
      setMoving(true);
      setAddressLoading(true);
    };
    const settle = () => {
      if (disposed || !map) return;
      invalidate();
      setMoving(false);
      const point = map.getCenter();
      const latitude = point.getLat(),
        longitude = point.getLng();
      const current = revision;
      // 검색 결과는 이미 검증된 주소입니다. 같은 위치라면 별도 역지오코딩 없이 재사용합니다.
      if (
        candidate?.address.trim() &&
        Math.abs(candidate.latitude - latitude) < 1e-7 &&
        Math.abs(candidate.longitude - longitude) < 1e-7
      ) {
        setPlace({ ...candidate, source: "MAP" });
        setAddressLoading(false);
        return;
      }
      controller = new AbortController();
      const signal = controller.signal;
      timer = setTimeout(() => {
        void api<Place>(
          `/mobility/location?latitude=${latitude}&longitude=${longitude}`,
          { signal },
        )
          .then((result) => {
            if (disposed || signal.aborted || current !== revision) return;
            setAddressLoading(false);
            if (!result.address.trim()) {
              setError(
                "이 위치의 주소를 찾지 못했어요. 가까운 건물이나 도로로 옮기거나 장소를 검색해 주세요.",
              );
              return;
            }
            setPlace({ ...result, latitude, longitude, source: "MAP" });
          })
          .catch((e: Error) => {
            if (disposed || signal.aborted || current !== revision) return;
            setAddressLoading(false);
            setError(
              "주소를 확인하지 못했어요. 다시 위치를 선택하거나 위에서 장소를 검색해 주세요.",
            );
            showError(e, "선택한 위치 주소 확인");
          });
      }, 250);
    };
    void loadMap()
      .then((loaded) => {
        if (disposed || !element.current) return;
        maps = loaded;
        candidate = pendingSearch.current || initial;
        map = new maps.Map(element.current, {
          center: new maps.LatLng(
            candidate?.latitude ?? 37.5665,
            candidate?.longitude ?? 126.978,
          ),
          level: 4,
        });
        const listen = (
          type: string,
          fn: (e?: { latLng: Coordinate }) => void,
        ) => {
          maps!.event.addListener(map!, type, fn);
          listeners.push({ type, fn });
        };
        listen("bounds_changed", invalidate);
        listen("dragstart", () => {
          candidate = null;
          setSearched(null);
          invalidate();
        });
        listen("zoom_start", invalidate);
        listen("idle", settle);
        listen("click", (e) => {
          if (!e) return;
          candidate = null;
          setSearched(null);
          invalidate();
          map!.setCenter(e.latLng);
          // 이미 중앙인 위치를 누르면 idle 이벤트가 없을 수도 있어 한 번 정착시킵니다.
          clearTimeout(timer);
          timer = setTimeout(settle, 160);
        });
        jump.current = (selected) => {
          candidate = selected;
          invalidate();
          map!.setCenter(
            new maps!.LatLng(selected.latitude, selected.longitude),
          );
          clearTimeout(timer);
          timer = setTimeout(settle, 160);
        };
        setMapReady(true);
        setLoading(false);
        settle();
      })
      .catch((e: Error) => {
        if (disposed) return;
        setError(e.message);
        setLoading(false);
        setAddressLoading(false);
        showError(e, "지도 선택을 준비하지 못했어요.");
      });
    return () => {
      disposed = true;
      revision++;
      controller?.abort();
      clearTimeout(timer);
      jump.current = null;
      if (map && maps)
        for (const { type, fn } of listeners)
          maps.event.removeListener(map, type, fn);
    };
  }, [initial]);

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
      title="지도에서 위치 선택"
      description="검색하거나 지도를 움직여 위치를 선택하세요."
    >
      <div className="sheet-body map-selection-body">
        <PlaceInput
          label={`${purpose} 검색`}
          value={searched}
          onChange={(selected) => {
            setSearched(selected);
            pendingSearch.current = selected;
            if (selected) jump.current?.(selected);
          }}
        />
        <div className="map-picker">
          <div ref={element} className="map-canvas" />
          {mapReady && (
            <>
              <span
                className={`map-pin ${moving ? "is-moving" : "is-settled"}`}
                data-moving={moving}
                aria-hidden="true"
              >
                <span className="map-pin-shadow" />
                <svg
                  className="map-pin-body"
                  width="36"
                  height="46"
                  viewBox="0 0 36 46"
                  fill="none"
                >
                  <path
                    d="M18 44s15-15.2 15-26A15 15 0 0 0 3 18c0 10.8 15 26 15 26Z"
                    fill="currentColor"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                  />
                  <circle cx="18" cy="17.5" r="5.5" fill="white" />
                </svg>
              </span>
              <span className="map-hint" aria-hidden="true">
                {moving
                  ? "원하는 위치로 이동하세요"
                  : "핀 아래 위치를 선택해요"}
              </span>
            </>
          )}
          {loading && (
            <p className="map-status" role="status">
              지도를 준비하고 있어요…
            </p>
          )}
        </div>
        <div className="map-selection-summary">
          <div
            className="map-selected-address"
            aria-live="polite"
            aria-busy={addressLoading}
          >
            <span className="eyebrow">{purpose}로 선택할 주소</span>
            <strong>
              {addressLoading
                ? moving
                  ? "지도를 움직이는 중이에요"
                  : "주소를 확인하고 있어요…"
                : place?.name || "위치를 다시 선택해 주세요"}
            </strong>
            {place && place.address !== place.name && (
              <p className="muted small">{place.address}</p>
            )}
            {!place && !error && (
              <p className="muted small">
                지도가 멈추면 도로명 또는 지번 주소를 알려드려요.
              </p>
            )}
          </div>
          <Notice message={error} error />
          <div className="map-selection-actions">
            <Button
              disabled={
                loading || !mapReady || moving || addressLoading || !place
              }
              onClick={() => {
                if (place) select(place);
              }}
            >
              이 위치로 설정
            </Button>
          </div>
        </div>
      </div>
    </Sheet>
  );
}

export function MapPicker(props: Parameters<typeof ConnectedMapPicker>[0]) {
  return isStaticDemo() ? (
    <StaticMapPicker {...props} />
  ) : (
    <ConnectedMapPicker {...props} />
  );
}

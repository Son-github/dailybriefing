// 날씨는 저장 지역을 query key에 포함해 지역 변경 시 이전 지역의 cache를 혼동하지 않습니다.
import { useState } from "react";
import { currentLocation } from "../transit/location";
import { showError } from "../../lib/errors";
import type { Place } from "../../types";
import { useQuery } from "@tanstack/react-query";
import { api, locationQuery } from "../../lib/api";
import { useSession } from "../../lib/store";
import { Sun } from "lucide-react";
import type { Weather } from "../../types";
import { number, QueryContent } from "../../components/ui/WidgetState";
import { Button, DataMeta } from "../../components/ui";
export function WeatherWidget() {
  const user = useSession((s) => s.user);
  const [gps, setGps] = useState<Place | null>(null);
  const [locating, setLocating] = useState(false);
  const q = useQuery({
    queryKey: [
      "weather",
      gps?.latitude ?? user?.latitude,
      gps?.longitude ?? user?.longitude,
    ],
    queryFn: () =>
      api<Weather>(
        `/weather?${gps ? `latitude=${gps.latitude}&longitude=${gps.longitude}` : locationQuery(user)}`,
      ),
    staleTime: 300_000,
  });
  return (
    <QueryContent query={q}>
      {(d) => (
        <>
          <div className="weather-main">
            <div>
              <p className="muted">
                {gps ? "현재 위치" : user?.locationName || "서울"} ·{" "}
                {d.condition}
              </p>
              <div className="big-number">
                {Math.round(d.temperature)}
                <span>°</span>
              </div>
              <p>
                {d.feelsLike === null
                  ? "기상청 단기예보"
                  : `체감 ${number(d.feelsLike, 0)}°`}{" "}
                <span className="muted ml-3">
                  최고 {d.high === null ? "미제공" : `${number(d.high, 0)}°`} /
                  최저 {d.low === null ? "미제공" : `${number(d.low, 0)}°`}
                </span>
              </p>
            </div>
            <div className="sun-art">
              <Sun size={72} strokeWidth={1.3} />
              <span className="sun-glow" />
            </div>
          </div>
          <div className="weather-details">
            <span>
              습도 <strong>{d.humidity}%</strong>
            </span>
            <span>
              강수확률 <strong>{d.precipitation}%</strong>
            </span>
          </div>
          <div className="location-actions">
            <Button
              variant="ghost"
              disabled={locating}
              onClick={async () => {
                setLocating(true);
                try {
                  setGps(await currentLocation());
                } catch (e) {
                  showError(e as Error, "현재 위치 날씨를 확인하지 못했어요.");
                } finally {
                  setLocating(false);
                }
              }}
            >
              {locating ? "위치 확인 중…" : "현재 위치 날씨"}
            </Button>
            {gps && (
              <Button variant="ghost" onClick={() => setGps(null)}>
                기본 지역으로
              </Button>
            )}
          </div>
          <DataMeta meta={d.meta} />
        </>
      )}
    </QueryContent>
  );
}

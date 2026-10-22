import { Badge } from "../../components/ui";
import type { TransitRoute } from "../../types";
export function RouteCard({ route }: { route: TransitRoute }) {
  return (
    <article className="route-card">
      <div className="route-summary">
        <div>
          <Badge>최단 소요시간 경로</Badge>
          <div className="route-duration">
            {route.durationMinutes}
            <span>분</span>
          </div>
        </div>
        <div className="transfer-count">
          {route.transferCount ? `환승 ${route.transferCount}회` : "환승 없이"}
          <p>
            {route.fareWon === null
              ? "요금 미제공"
              : `${route.fareWon.toLocaleString()}원`}
          </p>
          <small>{(route.distanceMeters / 1000).toFixed(1)}km</small>
        </div>
      </div>
      <details open>
        <summary>이동 단계 · {route.summary}</summary>
        <ol className="route-timeline">
          {route.steps.map((step, i) => (
            <li key={i}>
              <strong>
                {step.startName} → {step.endName}
              </strong>
              <span>
                {step.instruction} · {step.durationMinutes}분
              </span>
              {step.stops.length > 0 && (
                <small className="muted">경유 {step.stops.join(" · ")}</small>
              )}
            </li>
          ))}
        </ol>
      </details>
    </article>
  );
}

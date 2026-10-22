import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { useSession } from "../../lib/store";
import { Empty } from "../../components/ui";
import { QueryContent } from "../../components/ui/WidgetState";
import type { FavoriteRoute } from "../../types";
// Dashboard에서는 개인 장소 이름만 요약합니다. Tap하면 좌표로 최신 경로를 조회합니다.
export function TransitWidget() {
  const user = useSession((s) => s.user);
  const q = useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: () => api<FavoriteRoute[]>("/me/mobility/favorites"),
    enabled: !!user,
  });
  if (!user)
    return (
      <Empty title="오늘의 이동, 가볍게 준비해요.">
        <Link className="button secondary" to="/transit">
          경로 찾기
        </Link>
        <p className="muted small">
          로그인하면 자주 가는 길도 저장할 수 있어요.
        </p>
      </Empty>
    );
  return (
    <QueryContent query={q}>
      {(data) => (
        <>
          {data.length ? (
            <div className="favorite-list">
              {data.slice(0, 3).map((f) => (
                <Link
                  className="saved-route"
                  key={f.id}
                  to={`/transit?favorite=${f.id}`}
                >
                  <strong>{f.routeName}</strong>
                  <p className="muted small">
                    {f.needsLocation
                      ? "장소를 다시 선택해 주세요"
                      : `${f.start?.name} → ${f.end?.name}`}
                  </p>
                  <span className="subtle-link">최신 경로 확인 →</span>
                </Link>
              ))}
            </div>
          ) : (
            <Empty title="자주 가는 경로를 저장해 보세요." />
          )}
          <Link className="settings-link" to="/transit">
            다른 경로 찾기 →
          </Link>
        </>
      )}
    </QueryContent>
  );
}

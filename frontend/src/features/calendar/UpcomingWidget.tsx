import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { useSession } from "../../lib/store";
import { Empty } from "../../components/ui";
import { QueryContent } from "../../components/ui/WidgetState";
import type { CalendarEvent } from "../../types";
import { dayLabel, seoulToday } from "./dates";
export function UpcomingWidget() {
  const user = useSession((s) => s.user);
  const query = useQuery({
    queryKey: ["upcoming", user?.id, seoulToday()],
    queryFn: () => api<CalendarEvent[]>("/me/calendar/events/upcoming"),
    enabled: !!user,
  });
  if (!user)
    return (
      <Empty title="다음 약속도 한눈에 확인해요.">
        <Link className="button secondary" to="/login">
          로그인하고 일정 저장
        </Link>
      </Empty>
    );
  return (
    <QueryContent query={query}>
      {(events) => (
        <>
          {events.length ? (
            <div className="agenda-list">
              {events.map((e) => (
                <Link
                  className="agenda-item"
                  to={`/calendar?date=${e.eventDate}`}
                  key={e.id}
                >
                  <span className="dday">{dayLabel(e.daysUntil)}</span>
                  <span>
                    <strong>{e.title}</strong>
                    <small>
                      {e.eventDate.slice(5).replace("-", "월 ")}일 ·{" "}
                      {e.eventTime?.slice(0, 5) || "종일"}
                    </small>
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <Empty title="다가오는 일정이 아직 없어요.">
              <Link className="button secondary" to="/calendar?add=1">
                첫 일정 추가
              </Link>
            </Empty>
          )}
          <Link className="settings-link" to="/calendar">
            전체 일정 보기 →
          </Link>
        </>
      )}
    </QueryContent>
  );
}

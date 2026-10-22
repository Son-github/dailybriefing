import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus, CalendarDays } from "lucide-react";
import { api } from "../../lib/api";
import { useSession } from "../../lib/store";
import {
  Button,
  Card,
  Empty,
  Notice,
  ErrorState,
  DataMeta,
} from "../../components/ui";
import { QueryContent } from "../../components/ui/WidgetState";
import type { CalendarEvent, Holidays } from "../../types";
import {
  seoulToday,
  monthRange,
  shiftMonth,
  dateLabel,
  validDate,
} from "./dates";
import { EventEditor } from "./EventEditor";
export function CalendarPage() {
  const user = useSession((s) => s.user);
  const [params] = useSearchParams();
  const today = seoulToday();
  const initial = validDate(params.get("date")) ? params.get("date")! : today;
  const [month, setMonth] = useState(initial.slice(0, 7));
  const [selected, setSelected] = useState(initial);
  const [editing, setEditing] = useState<CalendarEvent | null | undefined>(
    user && params.get("add") === "1" ? null : undefined,
  );
  const range = monthRange(month);
  const [year, m] = month.split("-").map(Number);
  const events = useQuery({
    queryKey: ["calendar", user?.id, month],
    queryFn: () =>
      api<CalendarEvent[]>(
        `/me/calendar/events?from=${range.from}&to=${range.to}`,
      ),
    enabled: !!user,
  });
  const holidays = useQuery({
    queryKey: ["holidays", month],
    queryFn: () => api<Holidays>(`/calendar/holidays?year=${year}&month=${m}`),
    staleTime: 300000,
  });
  const offset = new Date(year, m - 1, 1).getDay();
  const days = new Date(year, m, 0).getDate();
  function changeMonth(delta: number) {
    const next = shiftMonth(month, delta);
    setMonth(next);
    setSelected(`${next}-01`);
  }
  const selectedEvents =
    events.data?.filter((e) => e.eventDate === selected) || [];
  const selectedHolidays =
    holidays.data?.holidays.filter((h) => h.date === selected) || [];
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">ROOM FOR WHAT MATTERS</div>
          <h1>나의 하루를 기록해요.</h1>
          <p className="muted">다가오는 약속도, 기억하고 싶은 날도.</p>
        </div>
        {user ? (
          <Button onClick={() => setEditing(null)}>
            <Plus size={17} />
            일정 추가
          </Button>
        ) : (
          <Link className="button primary" to="/login">
            로그인하고 일정 추가
          </Link>
        )}
      </div>
      {!user && (
        <Notice message="공휴일은 로그인 없이 볼 수 있어요. 개인 일정은 로그인하면 안전하게 저장돼요." />
      )}
      <div className="calendar-layout">
        <Card className="month-card">
          <div className="month-heading">
            <Button
              variant="ghost"
              aria-label="이전 달"
              onClick={() => changeMonth(-1)}
              disabled={year <= 1900 && m === 1}
            >
              <ChevronLeft size={20} />
            </Button>
            <h2>
              {year}년 {m}월
            </h2>
            <Button
              variant="ghost"
              aria-label="다음 달"
              onClick={() => changeMonth(1)}
              disabled={year >= 2200 && m === 12}
            >
              <ChevronRight size={20} />
            </Button>
          </div>
          <div className="month-grid" role="group" aria-label="날짜 선택">
            {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
              <span className="weekday" key={d}>
                {d}
              </span>
            ))}
            {Array.from({ length: offset }, (_, i) => (
              <span key={`blank${i}`} aria-hidden="true" />
            ))}
            {Array.from({ length: days }, (_, i) => {
              const date = `${month}-${String(i + 1).padStart(2, "0")}`;
              const dayEvents =
                events.data?.filter((e) => e.eventDate === date) || [];
              const holiday = holidays.data?.holidays.find(
                (h) => h.date === date,
              );
              return (
                <button
                  key={date}
                  className={`calendar-day ${date === selected ? "selected" : ""} ${date === today ? "today" : ""} ${holiday ? "holiday" : ""}`}
                  aria-pressed={date === selected}
                  aria-label={`${dateLabel(date)}${holiday ? `, ${holiday.name}` : ""}, 일정 ${dayEvents.length}개`}
                  onClick={() => setSelected(date)}
                >
                  <span>{i + 1}</span>
                  <span className="day-markers">
                    {holiday && <i className="holiday-dot" />}
                    {dayEvents.length > 0 && <i />}
                  </span>
                  <small className="desktop-event-label">
                    {holiday?.name || dayEvents[0]?.title || ""}
                  </small>
                </button>
              );
            })}
          </div>
          <div className="calendar-legend">
            <span>
              <i />
              개인 일정
            </span>
            <span>
              <i className="holiday-dot" />
              공휴일
            </span>
            <Button
              variant="ghost"
              onClick={() => {
                setMonth(today.slice(0, 7));
                setSelected(today);
              }}
            >
              오늘로
            </Button>
          </div>
          {holidays.isError ? (
            <ErrorState
              failure={holidays.error}
              retry={() => void holidays.refetch()}
            />
          ) : (
            holidays.data && <DataMeta meta={holidays.data.meta} />
          )}
        </Card>
        <Card className="agenda-card">
          <div className="section-caption">
            <CalendarDays size={18} />
            {dateLabel(selected)}
          </div>
          {selectedHolidays.map((h) => (
            <p className="holiday-label" key={h.name}>
              {h.name}
            </p>
          ))}
          {user ? (
            <QueryContent query={events}>
              {() =>
                selectedEvents.length ? (
                  <div className="agenda-list">
                    {selectedEvents.map((e) => (
                      <button
                        className="agenda-item event-button"
                        key={e.id}
                        onClick={() => setEditing(e)}
                      >
                        <span className="event-time">
                          {e.eventTime?.slice(0, 5) || "종일"}
                        </span>
                        <span>
                          <strong>{e.title}</strong>
                          {e.location && <small>{e.location}</small>}
                          {e.description && (
                            <small className="event-note">
                              {e.description}
                            </small>
                          )}
                        </span>
                        <ChevronRight size={16} />
                      </button>
                    ))}
                  </div>
                ) : (
                  <Empty title="아직 약속이 없는 날이에요.">
                    <Button
                      variant="secondary"
                      onClick={() => setEditing(null)}
                    >
                      이 날짜에 일정 추가
                    </Button>
                  </Empty>
                )
              }
            </QueryContent>
          ) : (
            <Empty title="내 일정이 머무는 공간이에요.">
              <Link className="button secondary" to="/signup">
                나의 달력 시작하기
              </Link>
            </Empty>
          )}
          <p className="muted small retention-note">
            지난 일정은 2년간 보관해요. 날짜는 서울 시간 기준이에요.
          </p>
        </Card>
      </div>
      {editing !== undefined && (
        <EventEditor
          event={editing}
          date={selected}
          close={() => setEditing(undefined)}
        />
      )}
    </>
  );
}

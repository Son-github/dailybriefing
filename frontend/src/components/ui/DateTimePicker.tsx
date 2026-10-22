import { useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, Clock3 } from "lucide-react";
import { Button, Sheet } from "./index";
import {
  seoulToday,
  shiftMonth,
  dateLabel,
} from "../../features/calendar/dates";
// 값은 서울의 날짜/시각 문자열 그대로 전송합니다. UTC 변환을 하지 않습니다.
export function DatePicker({
  label,
  value,
  onChange,
  name,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  name?: string;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState((value || seoulToday()).slice(0, 7));
  const [year, m] = month.split("-").map(Number);
  const days = new Date(year, m, 0).getDate();
  const first = new Date(year, m - 1, 1).getDay();
  return (
    <div className="field">
      <span>{label}</span>
      {name && <input type="hidden" name={name} value={value} />}
      <Button
        type="button"
        variant="secondary"
        className="picker-trigger"
        aria-label={`${label} 선택`}
        onClick={() => {
          setMonth((value || seoulToday()).slice(0, 7));
          setOpen(true);
        }}
      >
        <CalendarDays size={18} />
        {value ? dateLabel(value) : "날짜 선택"}
      </Button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="날짜 선택"
        description="원하는 날짜를 눌러 주세요."
      >
        <div className="sheet-body">
          <div className="picker-month">
            <Button
              type="button"
              variant="ghost"
              aria-label="이전 달"
              disabled={year <= 1900 && m === 1}
              onClick={() => setMonth(shiftMonth(month, -1))}
            >
              <ChevronLeft size={18} />
            </Button>
            <strong aria-live="polite">
              {year}년 {m}월
            </strong>
            <Button
              type="button"
              variant="ghost"
              aria-label="다음 달"
              disabled={year >= 2200 && m === 12}
              onClick={() => setMonth(shiftMonth(month, 1))}
            >
              <ChevronRight size={18} />
            </Button>
          </div>
          <div className="picker-calendar">
            {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
              <span className="muted" key={day}>
                {day}
              </span>
            ))}
            {Array.from({ length: first }, (_, i) => (
              <span key={`blank-${i}`} />
            ))}
            {Array.from({ length: days }, (_, i) => {
              const day = `${month}-${String(i + 1).padStart(2, "0")}`;
              return (
                <button
                  type="button"
                  key={day}
                  className={day === value ? "selected" : ""}
                  aria-label={dateLabel(day)}
                  aria-pressed={day === value}
                  onClick={() => {
                    onChange(day);
                    setOpen(false);
                  }}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              onChange(seoulToday());
              setOpen(false);
            }}
          >
            오늘 선택
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
export function TimePicker({
  label,
  value,
  onChange,
  name,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  name?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("09:00");
  return (
    <div className="field">
      <span>{label}</span>
      {name && <input type="hidden" name={name} value={value} />}
      <Button
        type="button"
        variant="secondary"
        className="picker-trigger"
        aria-label={`${label} 선택`}
        onClick={() => {
          setDraft(value || "09:00");
          setOpen(true);
        }}
      >
        <Clock3 size={18} />
        {value || "시간 지정 안 함"}
      </Button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="시간 선택"
        description="서울 시간 기준으로 선택해 주세요."
      >
        <div className="sheet-body">
          <div className="time-selectors">
            <label>
              시
              <select
                aria-label="시"
                value={draft.slice(0, 2)}
                onChange={(e) =>
                  setDraft(`${e.target.value}:${draft.slice(3, 5)}`)
                }
              >
                {Array.from({ length: 24 }, (_, i) =>
                  String(i).padStart(2, "0"),
                ).map((h) => (
                  <option key={h}>{h}</option>
                ))}
              </select>
            </label>
            <span>:</span>
            <label>
              분
              <select
                aria-label="분"
                value={draft.slice(3, 5)}
                onChange={(e) =>
                  setDraft(`${draft.slice(0, 2)}:${e.target.value}`)
                }
              >
                {Array.from({ length: 60 }, (_, i) =>
                  String(i).padStart(2, "0"),
                ).map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-actions">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              시간 지정 안 함
            </Button>
            <Button
              type="button"
              onClick={() => {
                onChange(draft);
                setOpen(false);
              }}
            >
              이 시간 선택
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}

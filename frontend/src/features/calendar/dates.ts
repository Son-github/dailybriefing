// 날짜 전용 값은 YYYY-MM-DD 문자열로 전송합니다. toISOString()은 서울 자정을 전날로 바꿀 수 있습니다.
export function seoulToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  return ["year", "month", "day"]
    .map((type) => parts.find((p) => p.type === type)!.value)
    .join("-");
}
export function dayLabel(days: number) {
  return days === 0 ? "D-Day" : days > 0 ? `D-${days}` : `D+${Math.abs(days)}`;
}
export function dateLabel(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return `${y}년 ${m}월 ${d}일`;
}
export function monthRange(month: string) {
  const [year, value] = month.split("-").map(Number);
  return {
    from: `${month}-01`,
    to: `${month}-${new Date(year, value, 0).getDate()}`,
  };
}
export function shiftMonth(month: string, delta: number) {
  const [year, value] = month.split("-").map(Number);
  const d = new Date(year, value - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// URL로 들어온 날짜도 검증해 잘못된 월/일이 Calendar 상태를 망가뜨리지 않게 합니다.
export function validDate(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  return (
    year >= 1900 &&
    year <= 2200 &&
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}

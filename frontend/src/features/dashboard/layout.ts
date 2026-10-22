import type { Widget } from "../../types";

// 저장된 순서는 유지합니다. 넓은 카드 앞/끝에 한 장만 남으면 전체 너비로 채웁니다.
export function dashboardSpans(widgets: Pick<Widget, "size">[]): boolean[] {
  const wide = widgets.map((widget) => widget.size === "LARGE");
  let pending = -1;
  widgets.forEach((_, index) => {
    if (wide[index]) {
      if (pending >= 0) wide[pending] = true;
      pending = -1;
    } else if (pending < 0) pending = index;
    else pending = -1;
  });
  if (pending >= 0) wide[pending] = true;
  return wide;
}

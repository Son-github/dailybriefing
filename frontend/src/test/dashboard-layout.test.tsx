import { expect, it } from "vitest";
import { dashboardSpans } from "../features/dashboard/layout";
it("카드 순서를 유지하고 홀수 카드 뒤에 빈 열을 남기지 않는다", () => {
  const sizes = (values: ("MEDIUM" | "LARGE")[]) =>
    values.map((size) => ({ size }));
  expect(dashboardSpans(sizes(["MEDIUM", "MEDIUM", "LARGE"]))).toEqual([
    false,
    false,
    true,
  ]);
  expect(dashboardSpans(sizes(["MEDIUM", "LARGE", "MEDIUM"]))).toEqual([
    true,
    true,
    true,
  ]);
  expect(
    dashboardSpans(sizes(["MEDIUM", "MEDIUM", "MEDIUM", "LARGE"])),
  ).toEqual([false, false, true, true]);
  expect(dashboardSpans(sizes(["LARGE", "MEDIUM", "MEDIUM"]))).toEqual([
    true,
    false,
    false,
  ]);
  expect(dashboardSpans([])).toEqual([]);
});

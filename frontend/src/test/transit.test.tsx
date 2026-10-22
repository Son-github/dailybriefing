import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RouteCard } from "../features/transit/RouteCard";
import type { TransitRoute } from "../types";
const route: TransitRoute = {
  durationMinutes: 20,
  distanceMeters: 3000,
  transferCount: 1,
  fareWon: 1600,
  summary: "2호선",
  steps: [],
};
describe("카카오맵 경로 표시", () => {
  it("최단 소요시간과 공급자 요금을 표시하고 출발·도착 시각을 만들지 않는다", () => {
    render(<RouteCard route={route} />);
    expect(screen.getByText("최단 소요시간 경로")).toBeInTheDocument();
    expect(screen.getByText("1,600원")).toBeInTheDocument();
    expect(screen.queryByText(/\d{2}:\d{2}/)).not.toBeInTheDocument();
  });
  it("확정 요금이 없으면 미제공으로 안내한다", () => {
    render(<RouteCard route={{ ...route, fareWon: null }} />);
    expect(screen.getByText("요금 미제공")).toBeInTheDocument();
  });
});

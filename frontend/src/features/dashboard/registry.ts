// 새 위젯은 이 registry와 공통 WidgetType에 등록하면 편집 목록과 렌더링에 함께 반영됩니다.
import type { ComponentType } from "react";
import { Sun, TrainFront, CalendarDays, Newspaper, Globe2 } from "lucide-react";
import type { WidgetType } from "../../types";
import { WeatherWidget } from "../weather/WeatherWidget";
import { ExchangeWidget } from "../exchange/ExchangeWidget";
import { TransitWidget } from "../transit/TransitWidget";
import { UpcomingWidget } from "../calendar/UpcomingWidget";
import { NewsWidget } from "../news/NewsWidget";
export const widgetRegistry: Record<
  WidgetType,
  {
    title: string;
    description: string;
    icon: ComponentType<{ size?: number }>;
    component: ComponentType;
    size: "MEDIUM" | "LARGE";
  }
> = {
  weather: {
    title: "오늘의 날씨",
    description: "외출 전, 오늘의 하늘부터",
    icon: Sun,
    component: WeatherWidget,
    size: "MEDIUM",
  },
  exchange: {
    title: "환율",
    description: "주요 통화의 흐름을 한눈에",
    icon: Globe2,
    component: ExchangeWidget,
    size: "MEDIUM",
  },
  transit: {
    title: "이동",
    description: "자주 가는 곳까지 더 빠르게",
    icon: TrainFront,
    component: TransitWidget,
    size: "MEDIUM",
  },
  calendar: {
    title: "다가오는 일정",
    description: "가장 가까운 약속 3개",
    icon: CalendarDays,
    component: UpcomingWidget,
    size: "MEDIUM",
  },
  news: {
    title: "오늘의 뉴스",
    description: "세상의 변화를 읽는 작은 시간",
    icon: Newspaper,
    component: NewsWidget,
    size: "LARGE",
  },
};

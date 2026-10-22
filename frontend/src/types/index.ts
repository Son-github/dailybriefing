export type Theme = "LIGHT" | "DARK" | "SYSTEM";
export type WidgetType =
  "weather" | "exchange" | "transit" | "calendar" | "news";
export interface Widget {
  id: string;
  type: WidgetType;
  enabled: boolean;
  order: number;
  size: "SMALL" | "MEDIUM" | "LARGE";
  settings: Record<string, unknown>;
}
export interface Dashboard {
  version: number;
  widgets: Widget[];
}
export interface Profile {
  id: string;
  email: string;
  nickname: string;
  locationName: string;
  latitude: number;
  longitude: number;
  theme: Theme;
  onboarded: boolean;
  categories: string[];
  keywords: string[];
}
export interface Meta {
  provider: string;
  mode: "DEMO" | "LIVE";
  updatedAt: string;
}
export interface Weather {
  temperature: number;
  feelsLike: number | null;
  high: number | null;
  low: number | null;
  condition: string;
  humidity: number;
  precipitation: number;
  meta: Meta;
}
export interface Exchange {
  rates: {
    currency: string;
    currencyName: string;
    displayUnit: number;
    pair: string;
    value: number;
    change: number | null;
    changePercent: number | null;
  }[];
  meta: Meta;
}
export interface Article {
  id: string;
  title: string;
  source: string;
  publishedAt: string;
  summary: string;
  url: string | null;
  category: string;
}
export interface Briefing {
  summaries: string[];
  meta: Meta;
}
export const categories = [
  { value: "technology", label: "IT" },
  { value: "business", label: "경제" },
  { value: "general", label: "사회" },
  { value: "world", label: "국제" },
  { value: "sports", label: "스포츠" },
];

// 이동·일정의 내부 API 계약입니다. Provider의 원본 필드명은 Frontend로 전달하지 않습니다.
export interface Place {
  id: string | null;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  source: "GPS" | "SEARCH" | "MAP" | "KAKAO";
  category: string | null;
}
export interface TransitStep {
  type: "WALK" | "BUS" | "SUBWAY";
  instruction: string;
  durationMinutes: number;
  distanceMeters: number;
  vehicleName: string;
  vehicleType: string;
  startName: string;
  endName: string;
  stops: string[];
  path: { latitude: number; longitude: number }[];
}
export interface TransitRoute {
  durationMinutes: number;
  distanceMeters: number;
  transferCount: number;
  fareWon: number | null;
  summary: string;
  steps: TransitStep[];
}
export interface TransitRoutes {
  routes: TransitRoute[];
  meta: Meta;
  notice: string;
}
export interface FavoriteRoute {
  id: string;
  routeName: string;
  start: Place | null;
  end: Place | null;
  needsLocation: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}
export interface CalendarEvent {
  id: string;
  title: string;
  eventDate: string;
  eventTime: string | null;
  description: string | null;
  location: string | null;
  daysUntil: number;
}
export interface Holidays {
  holidays: { date: string; name: string }[];
  meta: Meta;
}

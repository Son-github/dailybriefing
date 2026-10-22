import type { Article, Meta } from "../../types";
export const newsCategories = [
  { value: "IT", key: "it", label: "IT" },
  { value: "ECONOMY", key: "economy", label: "경제" },
  { value: "SOCIETY", key: "society", label: "사회" },
  { value: "WORLD", key: "world", label: "국제" },
  { value: "SPORTS", key: "sports", label: "스포츠" },
] as const;
export type NewsCategory = (typeof newsCategories)[number]["value"];
export interface NewsPageData {
  category: NewsCategory;
  items: Article[];
  hasMore: boolean;
  nextStart: number | null;
  meta: Meta;
}
export interface NewsSection extends Omit<NewsPageData, "meta"> {
  meta: Meta | null;
  error: {
    status: number;
    code: string;
    message: string;
    requestId?: string;
    details?: { provider?: string; upstreamStatus?: number };
  } | null;
}
export type NewsSections = Record<
  (typeof newsCategories)[number]["key"],
  NewsSection
>;
export function sectionKey(category: NewsCategory) {
  return newsCategories.find((c) => c.value === category)!.key;
}
// 기존 DB preference 값은 유지합니다. 검색어는 Backend enum이 결정합니다.
export function preferredCategory(values?: string[]): NewsCategory {
  const aliases: Record<string, NewsCategory> = {
    technology: "IT",
    business: "ECONOMY",
    general: "SOCIETY",
    world: "WORLD",
    sports: "SPORTS",
  };
  const selected = values
    ?.map((v) => aliases[v] || v)
    .find((v) => newsCategories.some((c) => c.value === v));
  return (selected as NewsCategory | undefined) || "IT";
}

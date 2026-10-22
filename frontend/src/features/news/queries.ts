import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { NewsCategory, NewsPageData, NewsSections } from "./model";
import { sectionKey } from "./model";
export const sectionsKey = ["news", "sections"] as const;
export function useNewsSections() {
  // 동일 조회 결과는 화면 사이에서만 잠시 공유합니다. DB/localStorage에 저장하지 않습니다.
  const client = useQueryClient();
  const query = useQuery({
    queryKey: sectionsKey,
    queryFn: ({ signal }) => api<NewsSections>("/news/sections", { signal }),
    staleTime: 300_000,
    gcTime: 300_000,
    refetchOnMount: false,
  });
  useEffect(() => {
    if (!query.dataUpdatedAt) return;
    // 켜 둔 화면도 24시간을 넘겨 보관하지 않습니다. inactive 데이터는 5분 뒤 제거됩니다.
    const timer = setTimeout(
      () => {
        client.removeQueries({ queryKey: ["news", "pages"] });
        void client.resetQueries({ queryKey: sectionsKey, exact: true });
      },
      Math.max(0, query.dataUpdatedAt + 24 * 60 * 60 * 1000 - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [client, query.dataUpdatedAt]);
  return query;
}
export function fetchNewsPage(
  category: NewsCategory,
  start: number,
  display: number,
  signal?: AbortSignal,
) {
  return api<NewsPageData>(
    `/news?category=${category}&start=${start}&display=${display}`,
    { signal },
  );
}
export function useSectionRetry(category: NewsCategory) {
  const client = useQueryClient();
  const q = useQuery({
    queryKey: ["news", "retry", category],
    enabled: false,
    gcTime: 0,
    queryFn: ({ signal }) => fetchNewsPage(category, 1, 5, signal),
  });
  return {
    ...q,
    retry: async () => {
      const result = await q.refetch();
      if (result.data)
        client.setQueryData<NewsSections>(sectionsKey, (old) =>
          old
            ? {
                ...old,
                [sectionKey(category)]: { ...result.data, error: null },
              }
            : old,
        );
    },
  };
}

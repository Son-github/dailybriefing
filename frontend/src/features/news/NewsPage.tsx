import { useInfiniteQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Card, Button, ErrorState } from "../../components/ui";
import { useSession } from "../../lib/store";
import { showError } from "../../lib/errors";
import {
  newsCategories,
  preferredCategory,
  sectionKey,
  type NewsSection,
} from "./model";
import { fetchNewsPage, useNewsSections } from "./queries";
import { NewsTabs } from "./NewsTabs";
import { NewsList, NewsSkeleton } from "./NewsList";
import { NewsSectionError } from "./NewsSectionError";

function CategoryFeed({ section }: { section: NewsSection }) {
  // 처음 받은 5개를 첫 페이지로 사용합니다. 탭 전환/페이지 진입은 추가 API를 호출하지 않습니다.
  const query = useInfiniteQuery({
    queryKey: ["news", "pages", section.category, section.meta?.updatedAt],
    initialPageParam: 1,
    initialData: {
      pages: [{ ...section, meta: section.meta! }],
      pageParams: [1],
    },
    queryFn: ({ pageParam, signal }) =>
      fetchNewsPage(
        section.category,
        pageParam,
        Math.min(10, 1001 - pageParam),
        signal,
      ),
    getNextPageParam: (last) =>
      last.hasMore ? (last.nextStart ?? undefined) : undefined,
    staleTime: Infinity,
    gcTime: 300_000,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
  const pages = query.data.pages;
  return (
    <>
      <NewsList
        expanded
        items={pages.flatMap((p) => p.items)}
        meta={pages.at(-1)!.meta}
      />
      {query.isFetchNextPageError && (
        <div className="news-more-error" role="alert">
          추가 뉴스를 불러오지 못했어요. 기존 기사는 계속 읽을 수 있어요.
          <Button
            variant="ghost"
            onClick={() =>
              showError(query.error!, "뉴스 더 보기", () =>
                query.fetchNextPage(),
              )
            }
          >
            문제 해결 방법
          </Button>
        </div>
      )}
      {query.hasNextPage ? (
        <Button
          className="news-more"
          variant="secondary"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {query.isFetchingNextPage
            ? "추가 뉴스를 불러오는 중…"
            : query.isFetchNextPageError
              ? "더 보기 다시 시도"
              : "더 보기"}
        </Button>
      ) : (
        <p className="muted small news-end">
          지금 볼 수 있는 검색 결과를 모두 확인했어요.
        </p>
      )}
    </>
  );
}
export function NewsPage() {
  const user = useSession((s) => s.user);
  const [params, setParams] = useSearchParams();
  const requested = params.get("category");
  const category =
    newsCategories.find((c) => c.value === requested)?.value ||
    preferredCategory(user?.categories);
  const query = useNewsSections();
  const section = query.data?.[sectionKey(category)];
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">DAILY NEWS</div>
          <h1>세상을 읽는 시간.</h1>
          <p className="muted">관심 분야의 최신 뉴스부터, 필요한 만큼만.</p>
        </div>
      </div>
      <Card className="news-page-card">
        <NewsTabs
          value={category}
          onChange={(value) =>
            setParams({ category: value }, { replace: true })
          }
        >
          {query.isPending ? (
            <NewsSkeleton />
          ) : query.isError ? (
            <ErrorState
              retry={() => void query.refetch()}
              details={() => showError(query.error, "뉴스 조회", query.refetch)}
            />
          ) : section?.error ? (
            <NewsSectionError section={section} />
          ) : section ? (
            <CategoryFeed key={category} section={section} />
          ) : null}
        </NewsTabs>
      </Card>
    </>
  );
}

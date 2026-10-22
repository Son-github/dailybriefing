import type { Article, Meta } from "../../types";
import { DataMeta, Empty, ExternalLink } from "../../components/ui";
export function relativeTime(value: string) {
  const date = new Date(value),
    seconds = Math.max(0, (Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "방금 전";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}분 전`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}시간 전`;
  if (seconds < 172800) return "어제";
  return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}
export function NewsList({
  items,
  meta,
  expanded = false,
}: {
  items: Article[];
  meta: Meta | null;
  expanded?: boolean;
}) {
  return (
    <>
      {items.length ? (
        <div className={`news-list ${expanded ? "expanded" : ""}`}>
          {items.map((article, index) => (
            <article className="news-article" key={`${article.id}-${index}`}>
              <h3>
                {article.url ? (
                  <ExternalLink url={article.url}>{article.title}</ExternalLink>
                ) : (
                  article.title
                )}
              </h3>
              <p className="article-summary">{article.summary}</p>
              <p className="article-meta">
                {article.source}
                <span>
                  {" "}
                  ·{" "}
                  <time
                    dateTime={article.publishedAt}
                    title={new Date(article.publishedAt).toLocaleString(
                      "ko-KR",
                    )}
                  >
                    {relativeTime(article.publishedAt)}
                  </time>
                </span>
              </p>
            </article>
          ))}
        </div>
      ) : (
        <Empty title="이 분야의 검색 결과가 아직 없어요. 다른 분야도 살펴보세요." />
      )}
      {meta && <DataMeta meta={meta} />}
      <div className="news-attribution">
        {/* 데이터 공급자와 공식 규격 링크를 함께 표시해 샘플/실제 검색 결과의 출처를 확인할 수 있게 합니다. */}
        <a
          href="https://api.ncloud-docs.com/docs/naver-api-hub-search-news"
          target="_blank"
          rel="noopener noreferrer"
        >
          NAVER API HUB
        </a>
        <span>
          {meta?.mode === "DEMO"
            ? "현재는 UI 체험용 샘플입니다."
            : "NAVER 검색결과 · 제공 순서 유지"}
        </span>
      </div>
    </>
  );
}
export function NewsSkeleton() {
  return (
    <div
      className="news-list news-skeleton"
      role="status"
      aria-label="뉴스를 불러오는 중"
    >
      {Array.from({ length: 5 }, (_, i) => (
        <div className="news-article" key={i}>
          <div className="skeleton news-line" />
          <div className="skeleton news-line short" />
        </div>
      ))}
    </div>
  );
}

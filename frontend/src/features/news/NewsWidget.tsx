import { useState } from "react";
import { Link } from "react-router-dom";
import { useSession } from "../../lib/store";
import { ErrorState } from "../../components/ui";
import { showError } from "../../lib/errors";
import { preferredCategory, sectionKey } from "./model";
import { useNewsSections } from "./queries";
import { NewsTabs } from "./NewsTabs";
import { NewsList, NewsSkeleton } from "./NewsList";
import { NewsSectionError } from "./NewsSectionError";
export function NewsWidget() {
  const user = useSession((s) => s.user);
  const [category, setCategory] = useState(() =>
    preferredCategory(user?.categories),
  );
  const query = useNewsSections();
  const section = query.data?.[sectionKey(category)];
  return (
    <>
      <NewsTabs value={category} onChange={setCategory}>
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
          <NewsList key={category} items={section.items} meta={section.meta} />
        ) : null}
      </NewsTabs>
      <Link
        className="button secondary news-all"
        to={`/news?category=${category}`}
      >
        전체 뉴스 보기
      </Link>
    </>
  );
}

import { Button } from "../../components/ui";
import { ApiError } from "../../lib/api";
import { showError, errorGuide } from "../../lib/errors";
import { newsCategories, type NewsSection } from "./model";
import { useSectionRetry } from "./queries";
export function NewsSectionError({ section }: { section: NewsSection }) {
  const retry = useSectionRetry(section.category);
  const label = newsCategories.find((c) => c.value === section.category)!.label;
  const failure = section.error!;
  return (
    <div className="empty-state" role="alert">
      <p>{label} 뉴스를 불러오지 못했어요.</p>
      <p className="muted small">{errorGuide(failure).cause}</p>
      <p className="small">
        오류 코드: <code>{failure.code}</code>
        {failure.requestId && (
          <>
            {" "}
            · 요청 번호: <code>{failure.requestId}</code>
          </>
        )}
      </p>
      <Button
        variant="secondary"
        disabled={retry.isFetching}
        onClick={() => void retry.retry()}
      >
        {retry.isFetching ? "다시 확인하는 중…" : "다시 시도"}
      </Button>
      <Button
        variant="ghost"
        onClick={() =>
          showError(
            new ApiError(
              failure.status,
              failure.code,
              failure.message,
              failure.requestId,
              failure.details,
            ),
            `${label} 뉴스 조회`,
            retry.retry,
          )
        }
      >
        문제 해결 방법
      </Button>
    </div>
  );
}

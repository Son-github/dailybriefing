import { useState } from "react";
import { Link } from "react-router-dom";
import { Copy, RefreshCw, CircleAlert } from "lucide-react";
import { errorGuide, useErrorDialog } from "../../lib/errors";
import { Button, Sheet } from "./index";
export function ErrorDialog() {
  const notice = useErrorDialog((s) => s.notice);
  const close = useErrorDialog((s) => s.close);
  const [copied, setCopied] = useState(false);
  if (!notice) return null;
  const guide = errorGuide(notice.error);
  const reference = `오류 코드: ${notice.error.code || "UNKNOWN"}\n요청 번호: ${notice.error.requestId || "없음"}`;
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) {
          close();
          setCopied(false);
        }
      }}
      title={guide.title}
      description={notice.context || "문제를 해결할 수 있도록 안내해 드릴게요."}
    >
      <div className="sheet-body error-guide">
        <CircleAlert size={32} aria-hidden="true" />
        <p>{guide.cause}</p>
        <h3>이렇게 해보세요</h3>
        <ol>
          {guide.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        {notice.count > 1 && (
          <p className="muted small">
            다른 요청에서도 문제가 발생했어요. 각 정보의 다시 시도 버튼으로
            확인할 수 있어요.
          </p>
        )}
        <div className="error-reference">
          <span>
            오류 코드 <code>{notice.error.code || "UNKNOWN"}</code>
          </span>
          {notice.error.requestId && (
            <span>
              요청 번호 <code>{notice.error.requestId}</code>
            </span>
          )}
        </div>
        <div className="form-actions">
          <Button
            variant="ghost"
            onClick={() => {
              void navigator.clipboard
                ?.writeText(reference)
                .then(() => setCopied(true))
                .catch(() => setCopied(false));
            }}
          >
            <Copy size={16} />
            {copied ? "복사했어요" : "문의 정보 복사"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              close();
              setCopied(false);
            }}
          >
            확인
          </Button>
          {notice.error.status === 401 && (
            <Link className="button primary" to="/login" onClick={close}>
              로그인하기
            </Link>
          )}
          {guide.retryable && notice.retry && (
            <Button
              onClick={() => {
                const retry = notice.retry;
                close();
                setCopied(false);
                void retry?.();
              }}
            >
              <RefreshCw size={16} />
              다시 시도
            </Button>
          )}
        </div>
      </div>
    </Sheet>
  );
}

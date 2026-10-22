import {
  runtime,
  isStaticDemo,
  backendUnavailable,
  runtimeError,
  chooseStaticDemo,
  retryLive,
} from "../../lib/runtime";
import { Button } from "../../components/ui";
export function RuntimeBanner() {
  if (runtime().mode === "LOCAL") return null;
  return (
    <div className="runtime-banner" role="status">
      <span>
        {runtimeError() ||
          (isStaticDemo()
            ? "샘플 체험 · 실제 정보/외부 API/서버 저장 미사용"
            : backendUnavailable()
              ? "LIVE 연결 확인 실패 · 샘플로 자동 대체하지 않았어요"
              : "LIVE · 서버 연결 확인 완료")}
      </span>
      {!isStaticDemo() && (
        <Button variant="ghost" onClick={chooseStaticDemo}>
          샘플 체험
        </Button>
      )}
      {runtime().liveEnabled && (
        <Button variant="ghost" onClick={retryLive}>
          LIVE 다시 연결
        </Button>
      )}
    </div>
  );
}

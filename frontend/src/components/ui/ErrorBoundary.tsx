import { Component, type ReactNode } from "react";
import { showError } from "../../lib/errors";
import { Button } from "./index";
// Provider 오류는 QueryContent가 처리하고, 예기치 않은 렌더링 오류는 이 경계가 격리합니다.
export class ErrorBoundary extends Component<
  { children: ReactNode; context?: string },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    showError(
      { code: "UI_ERROR" },
      this.props.context || "화면을 표시하지 못했어요.",
      () => window.location.reload(),
    );
  }
  render() {
    if (this.state.failed)
      return (
        <div className="error-state" role="alert">
          <p>이 화면을 표시하지 못했어요.</p>
          <Button variant="secondary" onClick={() => window.location.reload()}>
            화면 새로고침
          </Button>
          <Button
            variant="ghost"
            onClick={() =>
              showError({ code: "UI_ERROR" }, this.props.context, () =>
                window.location.reload(),
              )
            }
          >
            문제 해결 방법
          </Button>
        </div>
      );
    return this.props.children;
  }
}

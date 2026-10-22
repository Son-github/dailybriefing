import { showError } from "../../lib/errors";
import type { ReactNode } from "react";
import { Skeleton, ErrorState } from "./index";
export const number = (n: number, max = 2) =>
  n.toLocaleString("ko-KR", { maximumFractionDigits: max });
export function Change({ value }: { value: number | null }) {
  return value === null ? (
    <span className="muted">전일비 미제공</span>
  ) : (
    <span className={value >= 0 ? "positive" : "negative"}>
      {value >= 0 ? "+" : ""}
      {number(value)}%
    </span>
  );
}
export function QueryContent<T>({
  query,
  children,
}: {
  query: {
    isPending: boolean;
    isError: boolean;
    error?: Error | null;
    data: T | undefined;
    refetch: () => unknown;
  };
  children: (data: T) => ReactNode;
}) {
  if (query.isPending) return <Skeleton />;
  if (query.isError)
    return (
      <ErrorState
        failure={query.error || { code: "UNKNOWN" }}
        retry={() => void query.refetch()}
        details={() =>
          showError(
            query.error || {},
            "정보 조회 중 문제가 발생했어요.",
            query.refetch,
          )
        }
      />
    );
  return query.data ? children(query.data) : null;
}

// 환율 query는 선택 통화별로 cache하며 데이터 출처와 갱신 시각을 함께 보여줍니다.
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { Exchange } from "../../types";
import { number, Change, QueryContent } from "../../components/ui/WidgetState";
import { DataMeta } from "../../components/ui";
export function ExchangeWidget() {
  const q = useQuery({
    queryKey: ["exchange"],
    queryFn: () => api<Exchange>("/exchange-rates"),
    staleTime: 300_000,
  });
  return (
    <QueryContent query={q}>
      {(d) => (
        <>
          <p className="muted small">
            매매기준율 · 통화별 기준 단위를 확인해 주세요
          </p>
          <div className="data-list">
            {d.rates.map((r) => (
              <div key={r.currency} className="data-row">
                <div className="currency-symbol">
                  {r.currency === "USD"
                    ? "$"
                    : r.currency === "EUR"
                      ? "€"
                      : "¥"}
                </div>
                <div className="row-name">
                  <strong>{r.currency}</strong>
                  <span>
                    {r.pair} · {r.displayUnit || 1} {r.currency} 기준
                  </span>
                </div>
                <div className="row-value">
                  <strong>
                    {number(r.value)}
                    <small> 원</small>
                  </strong>
                  <span>
                    <Change value={r.changePercent} />
                    {r.change !== null && (
                      <span className="muted">
                        {" "}
                        · {r.change > 0 ? "+" : ""}
                        {number(r.change)}원
                      </span>
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <DataMeta meta={d.meta} />
        </>
      )}
    </QueryContent>
  );
}

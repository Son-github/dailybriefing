// 대시보드는 위젯 registry를 통해 렌더링하며 개별 위젯 query의 성공/실패를 기다리지 않습니다.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  SlidersHorizontal,
  ArrowRight,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import { api, locationQuery } from "../../lib/api";
import { useSession } from "../../lib/store";
import {
  Card,
  Button,
  Badge,
  Skeleton,
  ErrorState,
  Empty,
} from "../../components/ui";
import type { Dashboard, Briefing } from "../../types";
import { widgetRegistry } from "./registry";
import { ErrorBoundary } from "../../components/ui/ErrorBoundary";
import { DashboardEditor } from "./DashboardEditor";
import { dashboardSpans } from "./layout";
export function DashboardPage() {
  const user = useSession((s) => s.user);
  const [editing, setEditing] = useState(false);
  const q = useQuery({
    queryKey: ["dashboard", user?.id],
    queryFn: async () => {
      if (!user) {
        const raw = localStorage.getItem("db-guest-dashboard");
        if (raw) {
          try {
            const cached = JSON.parse(raw) as Dashboard;
            if (Array.isArray(cached.widgets)) {
              // 구버전 guest 설정의 종료된 widget을 걸러도 사용자가 정한 나머지 순서는 유지합니다.
              cached.widgets = cached.widgets
                .filter((w) => w.type in widgetRegistry)
                .map((w, order) => ({ ...w, order }));
              return cached;
            }
          } catch {
            localStorage.removeItem("db-guest-dashboard");
          }
        }
      }
      return api<Dashboard>("/dashboard");
    },
  });
  const briefing = useQuery({
    queryKey: ["briefing", user?.latitude, user?.longitude],
    queryFn: () => api<Briefing>(`/briefing?${locationQuery(user)}`),
    staleTime: 300_000,
  });
  const today = new Date();
  const visibleWidgets = (q.data?.widgets || [])
    .filter((widget) => widget.enabled)
    .sort((a, b) => a.order - b.order);
  const wide = dashboardSpans(visibleWidgets);
  return (
    <>
      <div className="page-heading dashboard-heading">
        <div>
          <div className="eyebrow">
            <span className="live-dot" />
            {today
              .toLocaleDateString("en-US", { weekday: "long" })
              .toUpperCase()}{" "}
            <span className="date-separator">/</span>{" "}
            {today.toLocaleDateString("ko-KR", {
              month: "long",
              day: "numeric",
            })}
          </div>
          <h1>
            {user ? `${user.nickname} 님의 하루,` : "당신의 하루,"}
            <br className="mobile-only" /> 한눈에 가볍게.
          </h1>
          <p className="muted">
            {user
              ? "내가 고른 정보로 채우는 오늘의 브리핑"
              : "이동과 약속, 날씨와 뉴스까지. 오늘 필요한 만큼."}
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => setEditing(true)}
          disabled={!q.data}
        >
          <SlidersHorizontal size={17} />
          <span>편집</span>
        </Button>
      </div>
      <section className="briefing-banner">
        <div className="briefing-icon">
          <Sparkles size={25} />
        </div>
        <div className="briefing-content">
          <div className="briefing-label">
            TODAY’S BRIEFING{" "}
            {briefing.data?.meta.mode === "DEMO" && <Badge>샘플</Badge>}
          </div>
          {briefing.isPending ? (
            <div className="skeleton w-3/4" />
          ) : briefing.isError ? (
            <p>요약을 준비하지 못했어요. 아래 카드에서 정보를 확인해 주세요.</p>
          ) : (
            <p>{briefing.data?.summaries.join(" ")}</p>
          )}
        </div>
        <span className="briefing-location">
          {user?.locationName || "서울"}
          <ArrowUpRight size={16} />
        </span>
      </section>
      {!user && (
        <div className="guest-banner">
          <span>
            <strong>나에게 맞는 하루를 만들어 볼까요?</strong>{" "}
            <span className="guest-copy">
              위젯과 관심 정보를 기기 간에 저장해요.
            </span>
          </span>
          <Link to="/signup">
            나만의 브리핑 시작
            <ArrowRight size={15} />
          </Link>
        </div>
      )}
      {q.isPending ? (
        <div className="dashboard-grid">
          <Card>
            <Skeleton />
          </Card>
          <Card>
            <Skeleton />
          </Card>
        </div>
      ) : q.isError ? (
        <ErrorState
          title="대시보드를 불러오지 못했어요."
          retry={() => void q.refetch()}
        />
      ) : (
        <div className="dashboard-grid">
          {visibleWidgets.map((w, index) => {
            const info = widgetRegistry[w.type];
            if (!info)
              return (
                <Card key={w.id}>
                  <Empty title="아직 지원되지 않는 위젯이에요." />
                </Card>
              );
            const Widget = info.component;
            return (
              <Card
                key={w.id}
                className={`widget ${wide[index] ? "widget-wide" : ""} widget-${w.type}`}
              >
                <div className="widget-heading">
                  <h2>
                    <info.icon size={18} />
                    {info.title}
                  </h2>
                </div>
                <div className="widget-content">
                  <ErrorBoundary context={`${info.title} 화면 오류`}>
                    <Widget />
                  </ErrorBoundary>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {q.data?.widgets.filter((w) => w.enabled).length === 0 && (
        <Card>
          <Empty title="나만의 첫 위젯을 추가해 보세요.">
            <Button onClick={() => setEditing(true)}>위젯 추가</Button>
          </Empty>
        </Card>
      )}
      {editing && q.data && (
        <DashboardEditor dashboard={q.data} close={() => setEditing(false)} />
      )}
    </>
  );
}

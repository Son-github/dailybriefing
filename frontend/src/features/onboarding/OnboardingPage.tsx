import { showError } from "../../lib/errors";
// 한 화면에 한 가지 결정만 보여줍니다. skip해도 서버 기본 대시보드를 사용할 수 있습니다.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { api, body, queryClient } from "../../lib/api";
import { useSession } from "../../lib/store";
import { Button, Card, Notice } from "../../components/ui";
import { locations, profileBody } from "../profile/preferences";
import { widgetRegistry } from "../dashboard/registry";
import type { Profile, Dashboard, WidgetType } from "../../types";
import { categories } from "../../types";
export function OnboardingPage() {
  const { user, setSession } = useSession();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [location, setLocation] = useState(user?.locationName || "서울");
  const [widgets, setWidgets] = useState<WidgetType[]>([
    "weather",
    "exchange",
    "transit",
    "calendar",
    "news",
  ]);
  const [news, setNews] = useState<string[]>(["technology"]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function complete(skip = false) {
    if (!user) return;
    setBusy(true);
    setError("");
    try {
      const chosen = locations.find((l) => l.name === location) || locations[0];
      if (!skip) {
        const d = await api<Dashboard>("/dashboard");
        await api("/dashboard", {
          method: "PUT",
          ...body({
            version: d.version,
            widgets: widgets.map((type, order) => ({
              id: crypto.randomUUID(),
              type,
              enabled: true,
              order,
              size: widgetRegistry[type].size,
              settings: {},
            })),
          }),
        });
      }
      const next = await api<Profile>("/users/me", {
        method: "PUT",
        ...body({
          ...profileBody(user),
          ...(skip
            ? {}
            : {
                locationName: chosen.name,
                latitude: chosen.latitude,
                longitude: chosen.longitude,
                categories: news,
              }),
          onboarded: true,
        }),
      });
      setSession(useSession.getState().token, next);
      queryClient.invalidateQueries();
      navigate("/");
    } catch (e) {
      showError(e instanceof Error ? e : {}, "요청을 처리하지 못했어요.");
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const titles = [
    "어디에서 하루를 시작하나요?",
    "어떤 정보가 필요한가요?",
    "관심 있는 이야기를 골라요.",
  ];
  return (
    <div className="onboarding">
      <div className="eyebrow">A LITTLE MORE PERSONAL</div>
      <div className="steps">
        {[0, 1, 2].map((n) => (
          <span key={n} className={n <= step ? "active" : ""}>
            {n < step ? <Check size={16} /> : n + 1}
          </span>
        ))}
      </div>
      <h1>{titles[step]}</h1>
      <p className="muted">
        {
          [
            "우리 동네 날씨를 알려드릴게요.",
            "언제든 대시보드에서 다시 바꿀 수 있어요.",
            "내가 읽고 싶은 뉴스 취향을 알려주세요.",
          ][step]
        }
      </p>
      <Card>
        {step === 0 ? (
          <div className="selection-grid">
            {locations.map((l) => (
              <button
                key={l.name}
                className={location === l.name ? "selected" : ""}
                aria-pressed={location === l.name}
                onClick={() => setLocation(l.name)}
              >
                {l.name}
              </button>
            ))}
          </div>
        ) : step === 1 ? (
          <div className="selection-grid">
            {Object.entries(widgetRegistry).map(([t, info]) => (
              <button
                key={t}
                aria-pressed={widgets.includes(t as WidgetType)}
                className={widgets.includes(t as WidgetType) ? "selected" : ""}
                onClick={() =>
                  setWidgets((old) =>
                    old.includes(t as WidgetType)
                      ? old.filter((w) => w !== t)
                      : [...old, t as WidgetType],
                  )
                }
              >
                <info.icon size={22} />
                {info.title}
              </button>
            ))}
          </div>
        ) : (
          <>
            <fieldset className="category-checks">
              <legend>뉴스 카테고리 · 1개 이상</legend>
              {categories.map((c) => (
                <label key={c.value}>
                  <input
                    type="checkbox"
                    checked={news.includes(c.value)}
                    onChange={(e) =>
                      setNews((old) =>
                        e.target.checked
                          ? [...old, c.value]
                          : old.filter((n) => n !== c.value),
                      )
                    }
                  />
                  {c.label}
                </label>
              ))}
            </fieldset>
          </>
        )}
        <Notice message={error} error />
        <div className="onboarding-actions">
          {step > 0 && (
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => setStep((n) => n - 1)}
            >
              이전
            </Button>
          )}
          <Button
            disabled={busy || (step === 2 && !news.length)}
            onClick={() => (step < 2 ? setStep((n) => n + 1) : void complete())}
          >
            {busy ? "설정 저장 중…" : step < 2 ? "다음" : "내 브리핑 시작하기"}
            <ArrowRight size={17} />
          </Button>
        </div>
      </Card>
      <Button
        variant="ghost"
        disabled={busy}
        onClick={() => void complete(true)}
      >
        나중에 설정할게요
      </Button>
    </div>
  );
}

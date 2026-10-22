import { showError } from "../../lib/errors";
import { Button, Card, Notice } from "../../components/ui";
import { Sun, Moon, Monitor } from "lucide-react";
import { useState } from "react";
import { useSession } from "../../lib/store";
import { api, body } from "../../lib/api";
import type { Profile, Theme } from "../../types";
import { profileBody } from "./preferences";
export function ThemeSettings() {
  const { user, token, theme, setTheme, setSession } = useSession();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  async function save() {
    if (!user) return;
    setBusy(true);
    try {
      const next = await api<Profile>("/users/me", {
        method: "PUT",
        ...body({ ...profileBody(user), theme }),
      });
      setSession(useSession.getState().token || token, next);
      setError(false);
      setMessage("기기 간에 테마 설정을 저장했어요.");
    } catch (e) {
      showError(e instanceof Error ? e : {}, "요청을 처리하지 못했어요.");
      setError(true);
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const themes: { value: Theme; title: string; icon: typeof Sun }[] = [
    { value: "LIGHT", title: "라이트", icon: Sun },
    { value: "DARK", title: "다크", icon: Moon },
    { value: "SYSTEM", title: "시스템", icon: Monitor },
  ];
  return (
    <Card>
      <h2>화면 스타일</h2>
      <p className="muted">눈이 편안한 모습으로 선택하세요.</p>
      <div className="theme-options" role="group" aria-label="테마 선택">
        {themes.map((t) => (
          <button
            key={t.value}
            aria-pressed={theme === t.value}
            onClick={() => setTheme(t.value)}
            className={theme === t.value ? "active" : ""}
          >
            <t.icon size={22} />
            {t.title}
          </button>
        ))}
      </div>
      {user && (
        <Button variant="secondary" onClick={save} disabled={busy}>
          테마 설정 저장
        </Button>
      )}
      <Notice message={message} error={error} />
    </Card>
  );
}
export function SettingsPage() {
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">MAKE IT YOURS</div>
          <h1>나에게 편안한 화면.</h1>
        </div>
      </div>
      <div className="narrow">
        <ThemeSettings />
      </div>
    </>
  );
}

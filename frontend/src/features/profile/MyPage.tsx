import { showError } from "../../lib/errors";
// 프로필 저장·보안·계정 삭제를 담당합니다. 탈퇴 성공 후 query와 인증 상태를 즉시 비웁니다.
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowUpRight, MapPin, UserRound, ShieldCheck } from "lucide-react";
import { api, body, logout, clearSession, queryClient } from "../../lib/api";
import { useSession } from "../../lib/store";
import { Button, Card, Input, Notice, Sheet } from "../../components/ui";
import { categories, type Profile } from "../../types";
import { locations, profileBody } from "./preferences";
import { ThemeSettings } from "./ThemeSettings";
export function MyPage() {
  const { user, setSession } = useSession();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [deleting, setDeleting] = useState(false);
  if (!user)
    return (
      <div className="guest-my">
        <div className="profile-icon">
          <UserRound size={30} />
        </div>
        <h1>나만의 하루를 저장해요.</h1>
        <p className="muted">
          내 일정, 자주 가는 경로, 뉴스 취향까지.
          <br />
          로그인하면 어디서든 같은 브리핑을 만나요.
        </p>
        <Link className="button primary" to="/login">
          로그인
        </Link>
        <Link className="button secondary" to="/signup">
          회원가입
        </Link>
        <Link className="subtle-link" to="/settings">
          화면 스타일 설정
          <ArrowUpRight size={16} />
        </Link>
      </div>
    );
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const f = new FormData(e.currentTarget);
    const chosen = locations.find((l) => l.name === f.get("location"));
    try {
      const updated = await api<Profile>("/users/me", {
        method: "PUT",
        ...body({
          ...profileBody(user),
          nickname: f.get("nickname"),
          ...(chosen
            ? {
                locationName: chosen.name,
                latitude: chosen.latitude,
                longitude: chosen.longitude,
              }
            : {}),
          categories: f.getAll("categories"),
        }),
      });
      setSession(useSession.getState().token, updated);
      queryClient.invalidateQueries();
      setError(false);
      setMessage("내 취향을 저장했어요.");
    } catch (e) {
      showError(e instanceof Error ? e : {}, "요청을 처리하지 못했어요.");
      setError(true);
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function password(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      await api("/users/me/password", {
        method: "PUT",
        ...body(Object.fromEntries(f)),
      });
      await logout();
      navigate("/login");
    } catch (e) {
      showError(e instanceof Error ? e : {}, "요청을 처리하지 못했어요.");
      setError(true);
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      await api("/users/me", {
        method: "DELETE",
        ...body({ password: f.get("password") }),
      });
      // 서버에서 계정/세션을 이미 삭제했습니다. 추가 logout 요청 실패 때문에 화면 정리를 막지 않습니다.
      clearSession();
      navigate("/", { replace: true });
    } catch (e) {
      showError(e instanceof Error ? e : {}, "요청을 처리하지 못했어요.");
      setError(true);
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">MY DAILY SPACE</div>
          <h1>{user.nickname} 님의 공간.</h1>
          <p className="muted">매일의 정보도, 나의 취향대로.</p>
        </div>
        <Button
          variant="secondary"
          disabled={busy || loggingOut}
          onClick={async () => {
            setLoggingOut(true);
            try {
              await logout();
              navigate("/");
            } catch (e) {
              showError(
                e instanceof Error ? e : {},
                "요청을 처리하지 못했어요.",
              );
              setError(true);
              setMessage((e as Error).message);
            } finally {
              setLoggingOut(false);
            }
          }}
        >
          {loggingOut ? "로그아웃 중…" : "로그아웃"}
        </Button>
      </div>
      <Notice message={message} error={error} />
      <div className="settings-grid">
        <Card>
          <h2>
            <UserRound size={19} />
            프로필과 관심 정보
          </h2>
          <p className="muted small">{user.email}</p>
          <form onSubmit={save}>
            <Input
              id="my-nickname"
              name="nickname"
              label="닉네임"
              defaultValue={user.nickname}
              required
              maxLength={40}
            />
            <label className="field">
              <span>
                <MapPin size={15} />
                기본 지역
              </span>
              <select name="location" defaultValue={user.locationName}>
                {!locations.some((l) => l.name === user.locationName) && (
                  <option>{user.locationName}</option>
                )}
                {locations.map((l) => (
                  <option key={l.name}>{l.name}</option>
                ))}
              </select>
            </label>
            <fieldset className="category-checks">
              <legend>먼저 볼 뉴스 분야 · 1개 이상</legend>
              {categories.map((c) => (
                <label key={c.value}>
                  <input
                    type="checkbox"
                    name="categories"
                    value={c.value}
                    defaultChecked={
                      user.categories.includes(c.value) ||
                      (c.value === "technology" &&
                        user.categories.every((value) => value === "all"))
                    }
                  />
                  {c.label}
                </label>
              ))}
            </fieldset>
            <Button type="submit" disabled={busy}>
              내 취향 저장
            </Button>
          </form>
        </Card>
        <div className="settings-stack">
          <ThemeSettings />
          <Card>
            <h2>나만의 대시보드</h2>
            <p className="muted">원하는 정보만, 편한 순서로.</p>
            <Link className="settings-link" to="/">
              대시보드 편집하기
              <ArrowUpRight size={18} />
            </Link>
            <Link className="settings-link" to="/transit">
              저장한 이동 경로 관리
              <ArrowUpRight size={18} />
            </Link>
            <Link className="settings-link" to="/calendar">
              내 일정 관리
              <ArrowUpRight size={18} />
            </Link>
            <Link className="settings-link" to="/onboarding">
              초기 설정 다시 하기
              <ArrowUpRight size={18} />
            </Link>
          </Card>
        </div>
        <Card>
          <h2>
            <ShieldCheck size={19} />
            비밀번호 변경
          </h2>
          <p className="muted small">
            변경하면 모든 기기에서 다시 로그인해야 해요.
          </p>
          <form onSubmit={password}>
            <Input
              id="current-password"
              name="currentPassword"
              label="현재 비밀번호"
              type="password"
              autoComplete="current-password"
              required
            />
            <Input
              id="new-password"
              name="newPassword"
              label="새 비밀번호 · 10자 이상"
              type="password"
              autoComplete="new-password"
              minLength={10}
              maxLength={72}
              required
            />
            <Button variant="secondary" type="submit" disabled={busy}>
              비밀번호 변경
            </Button>
          </form>
        </Card>
        <Card>
          <h2>계정 관리</h2>
          <p className="muted">
            탈퇴하면 개인 일정, 저장한 경로, 대시보드와 모든 설정이 삭제돼요.
          </p>
          <Button variant="danger" onClick={() => setDeleting(true)}>
            회원 탈퇴
          </Button>
        </Card>
      </div>
      <Sheet
        open={deleting}
        onOpenChange={setDeleting}
        title="계정을 삭제할까요?"
        description="일정·즐겨찾기·대시보드·개인 설정이 즉시 삭제돼요. 복구할 수 없으며 같은 이메일로 다시 가입해도 복원되지 않아요."
      >
        <form className="sheet-body" onSubmit={remove}>
          <Input
            id="delete-password"
            name="password"
            label="비밀번호로 확인"
            type="password"
            required
            autoComplete="current-password"
          />
          <Notice message={error ? message : ""} error />
          <Button
            variant="secondary"
            type="button"
            disabled={busy}
            onClick={() => setDeleting(false)}
          >
            취소하고 돌아가기
          </Button>
          <Button type="submit" variant="danger" disabled={busy}>
            계정과 모든 정보 삭제
          </Button>
        </form>
      </Sheet>
    </>
  );
}

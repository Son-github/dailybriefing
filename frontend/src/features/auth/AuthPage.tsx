import { isStaticDemo } from "../../lib/runtime";
import { showError } from "../../lib/errors";
// 인증 성공 시 이전 계정의 query cache를 비운 후 memory token과 프로필을 설정합니다.
import { useState, type FormEvent } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { ArrowRight, Layers3 } from "lucide-react";
import { api, body, queryClient } from "../../lib/api";
import { useSession } from "../../lib/store";
import { Button, Input, Notice } from "../../components/ui";
import type { Profile } from "../../types";
export function AuthPage({ signup = false }: { signup?: boolean }) {
  const navigate = useNavigate();
  const { user, setSession, setTheme } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (isStaticDemo())
    return (
      <section className="auth-card">
        <h1>지금은 샘플 체험 중이에요</h1>
        <p>
          회원가입·로그인·개인 데이터 저장은 LIVE 서버가 켜져 있을 때 사용할 수
          있어요. 입력한 비밀번호를 브라우저에 저장하는 모의 로그인은 제공하지
          않아요.
        </p>
        <Link className="button primary" to="/">
          샘플 대시보드 보기
        </Link>
      </section>
    );
  if (user)
    return (
      <Navigate to={signup && !user.onboarded ? "/onboarding" : "/"} replace />
    );
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      const result = await api<{ accessToken: string; user: Profile }>(
        signup ? "/auth/signup" : "/auth/login",
        { method: "POST", ...body(Object.fromEntries(form)) },
      );
      queryClient.clear();
      setSession(result.accessToken, result.user);
      setTheme(result.user.theme);
      navigate(signup ? "/onboarding" : "/");
    } catch (e) {
      showError(e instanceof Error ? e : {}, "요청을 처리하지 못했어요.");
      setError(e instanceof Error ? e.message : "다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-layout">
      <div className="auth-story">
        <div className="eyebrow">YOUR DAY, YOUR WAY</div>
        <h1>
          좋은 하루는
          <br />
          작은 브리핑에서.
        </h1>
        <p>
          날씨부터 세상의 흐름까지.
          <br />
          내가 고른 정보로 하루를 시작하세요.
        </p>
        <div className="auth-art">
          <Layers3 size={90} strokeWidth={1} />
          <span>한 곳에서, 나에게 맞게.</span>
        </div>
      </div>
      <section className="auth-card">
        <h2>{signup ? "나만의 하루를 시작해요" : "다시 만나 반가워요"}</h2>
        <p className="muted">
          {signup
            ? "필요한 정보만 골라, 내 취향대로."
            : "저장해 둔 나만의 브리핑이 기다려요."}
        </p>
        <form onSubmit={submit}>
          {signup && (
            <Input
              id="nickname"
              name="nickname"
              label="닉네임"
              required
              maxLength={40}
              autoComplete="nickname"
              placeholder="어떻게 불러드릴까요?"
            />
          )}
          <Input
            id="email"
            name="email"
            label="이메일"
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            placeholder="you@example.com"
          />
          <Input
            id="password"
            name="password"
            label="비밀번호"
            type="password"
            required
            minLength={signup ? 10 : undefined}
            maxLength={72}
            autoComplete={signup ? "new-password" : "current-password"}
            placeholder={
              signup ? "10자 이상 입력해 주세요" : "비밀번호를 입력해 주세요"
            }
          />
          <Notice message={error} error />
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "잠시만 기다려 주세요" : signup ? "회원가입" : "로그인"}
            <ArrowRight size={17} />
          </Button>
        </form>
        <p className="auth-switch">
          {signup ? "이미 계정이 있나요?" : "아직 계정이 없나요?"}{" "}
          <Link to={signup ? "/login" : "/signup"}>
            {signup ? "로그인" : "회원가입"}
          </Link>
        </p>
        <Link className="guest-link" to="/">
          먼저 둘러볼게요
        </Link>
      </section>
    </div>
  );
}

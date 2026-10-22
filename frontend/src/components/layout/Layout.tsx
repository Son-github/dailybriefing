import { RuntimeBanner } from "../../features/demo/RuntimeBanner";
import { NavLink, Outlet, Link } from "react-router-dom";
import {
  House,
  TrainFront,
  CalendarDays,
  Newspaper,
  UserRound,
  Sun,
  Moon,
  ArrowUpRight,
  Layers3,
} from "lucide-react";
import { useEffect } from "react";
import { useSession } from "../../lib/store";
import { Button } from "../ui";
const nav = [
  { to: "/", icon: House, label: "홈", end: true },
  { to: "/transit", icon: TrainFront, label: "이동", end: false },
  { to: "/calendar", icon: CalendarDays, label: "일정", end: false },
  { to: "/news", icon: Newspaper, label: "뉴스", end: false },
  { to: "/my", icon: UserRound, label: "마이", end: false },
];
export function Layout() {
  const { user, theme, setTheme } = useSession();
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () =>
      document.documentElement.classList.toggle(
        "dark",
        theme === "DARK" || (theme === "SYSTEM" && media.matches),
      );
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
  return (
    <>
      <a className="skip-link" href="#main">
        본문 바로가기
      </a>
      <header className="header">
        <div className="header-inner">
          <Link to="/" className="logo" aria-label="Daily Briefing 홈">
            <span className="logo-mark">
              <Layers3 size={21} />
            </span>
            daily<span className="logo-light">briefing</span>
            <span className="logo-dot" />
          </Link>
          <nav className="desktop-nav" aria-label="주 메뉴">
            {nav.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="header-actions">
            <Button
              variant="ghost"
              aria-label={
                theme === "DARK" ? "라이트 테마로 변경" : "다크 테마로 변경"
              }
              onClick={() => setTheme(theme === "DARK" ? "LIGHT" : "DARK")}
            >
              {theme === "DARK" ? <Sun size={19} /> : <Moon size={19} />}
            </Button>
            <Link className="account-link" to={user ? "/my" : "/login"}>
              {user ? `${user.nickname} 님` : "로그인"}
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
      </header>
      <RuntimeBanner />
      <main id="main" className="main">
        <Outlet />
      </main>
      <footer className="footer">
        <span>daily briefing</span>
        <span>당신의 하루에 필요한 만큼.</span>
        <span>© {new Date().getFullYear()} Daily Briefing</span>
      </footer>
      <nav className="bottom-nav" aria-label="모바일 주 메뉴">
        {nav.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end}>
            <n.icon size={21} />
            <span>{n.label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}

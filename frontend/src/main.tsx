import { initializeRuntime } from "./lib/runtime";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { queryClient, refresh } from "./lib/api";
import { useSession } from "./lib/store";
import { Layout } from "./components/layout/Layout";
import { Skeleton, Card } from "./components/ui";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { AuthPage } from "./features/auth/AuthPage";
import { MyPage } from "./features/profile/MyPage";
import { SettingsPage } from "./features/profile/ThemeSettings";
import { NewsPage } from "./features/news/NewsPage";
import { TransitPage } from "./features/transit/TransitPage";
import { CalendarPage } from "./features/calendar/CalendarPage";
import { OnboardingPage } from "./features/onboarding/OnboardingPage";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { ErrorDialog } from "./components/ui/ErrorDialog";
import "./styles.css";
function Protected({ children }: { children: ReactNode }) {
  const user = useSession((s) => s.user);
  return user ? children : <Navigate to="/login" replace />;
}
function App() {
  const ready = useSession((s) => s.ready);
  useEffect(() => {
    void refresh().finally(() => useSession.getState().setReady());
  }, []);
  if (!ready)
    return (
      <div className="bootstrap">
        <Card>
          <Skeleton />
        </Card>
      </div>
    );
  return (
    <BrowserRouter>
      <ErrorDialog />
      <ErrorBoundary>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="news" element={<NewsPage />} />
            <Route path="transit" element={<TransitPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="login" element={<AuthPage />} />
            <Route path="signup" element={<AuthPage signup />} />
            <Route path="my" element={<MyPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route
              path="onboarding"
              element={
                <Protected>
                  <OnboardingPage />
                </Protected>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
void initializeRuntime().then(() =>
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  ),
);

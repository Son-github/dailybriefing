import { create } from "zustand";
import type { Profile, Theme } from "../types";
interface Session {
  token: string | null;
  user: Profile | null;
  ready: boolean;
  theme: Theme;
  setSession: (token: string | null, user: Profile | null) => void;
  setReady: () => void;
  setTheme: (theme: Theme) => void;
}
function storedTheme(): Theme {
  const t = localStorage.getItem("db-theme");
  return t === "DARK" || t === "LIGHT" ? t : "SYSTEM";
}
export const useSession = create<Session>((set) => ({
  token: null,
  user: null,
  ready: false,
  theme: storedTheme(),
  setSession: (token, user) => set({ token, user }),
  setReady: () => set({ ready: true }),
  setTheme: (theme) => {
    localStorage.setItem("db-theme", theme);
    set({ theme });
  },
}));

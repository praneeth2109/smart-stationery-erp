"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AuthUser, api, registerSilentRefresh, unregisterSilentRefresh } from "@/lib/api";

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "stationery_erp_session";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Keep a ref so the registered callback always reads the latest value
  // without being a stale closure.
  const accessTokenRef = useRef<string | null>(null);
  accessTokenRef.current = accessToken;

  // ── Persist helpers ────────────────────────────────────────────────────
  function persistSession(sessionUser: AuthUser, token: string) {
    setUser(sessionUser);
    setAccessToken(token);
    // Only persist non-sensitive data; refresh token lives in HttpOnly cookie
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ user: sessionUser, accessToken: token })
    );
  }

  function clearSession() {
    setUser(null);
    setAccessToken(null);
    window.localStorage.removeItem(STORAGE_KEY);
  }

  // ── Silent refresh callback (called by api.ts on 401) ──────────────────
  const silentRefresh = useCallback(async (): Promise<string | null> => {
    try {
      const result = await api.silentRefresh();
      // Update state and storage with the new access token
      persistSession(result.user, result.accessToken);
      return result.accessToken;
    } catch {
      clearSession();
      return null;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Register / unregister on mount / unmount
  useEffect(() => {
    registerSilentRefresh(silentRefresh);
    return () => unregisterSilentRefresh();
  }, [silentRefresh]);

  // ── Hydrate from localStorage on first render ──────────────────────────
  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setUser(parsed.user ?? null);
        setAccessToken(parsed.accessToken ?? null);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  // ── Auth actions ────────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    const result = await api.login(email, password);
    persistSession(result.user, result.accessToken);
    // refreshToken now lives exclusively in the HttpOnly cookie set by the server
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const logout = useCallback(async () => {
    // The cookie will be cleared server-side; pass nothing from JS
    await api.logout().catch(() => undefined);
    clearSession();
  }, []);

  return (
    <AuthContext.Provider value={{ user, accessToken, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

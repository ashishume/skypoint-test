import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/api/client";
import type { User, UserRole } from "@/api/types";

interface AuthContextValue {
  user: User | null;
  isBootstrapping: boolean;
  isAuthenticated: boolean;
  setSession: (user: User) => void;
  setRegisteredUser: (user: User) => void;
  logout: () => void;
  hasRole: (role: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    let ignore = false;
    async function restoreSession() {
      try {
        const currentUser = await authApi.me();
        if (!ignore) setUser(currentUser);
      } catch {
        // No valid session cookie — user stays logged out.
      } finally {
        if (!ignore) setIsBootstrapping(false);
      }
    }
    restoreSession();
    return () => {
      ignore = true;
    };
  }, []);

  const setSession = useCallback((loggedInUser: User) => {
    setUser(loggedInUser);
  }, []);

  const setRegisteredUser = useCallback((registeredUser: User) => {
    setUser(registeredUser);
  }, []);

  const logout = useCallback(() => {
    authApi.logout().catch(() => {});
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isBootstrapping,
      isAuthenticated: Boolean(user),
      setSession,
      setRegisteredUser,
      logout,
      hasRole: (role) => user?.role === role,
    }),
    [isBootstrapping, logout, setRegisteredUser, setSession, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

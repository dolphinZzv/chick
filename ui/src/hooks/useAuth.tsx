import { useState, useCallback, useContext, createContext, type ReactNode } from "react";
import { getToken, setToken, clearToken, getAgentId, setAgentId, clearAgentId } from "@/lib/auth";

interface AuthState {
  agentId: string;
  token: string;
}

interface AuthContextType {
  agent: AuthState | null;
  login: (token: string, agentId: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [agent, setAgent] = useState<AuthState | null>(() => {
    const token = getToken();
    const agentId = getAgentId();
    if (token && agentId) return { token, agentId };
    return null;
  });

  const login = useCallback((token: string, agentId: string) => {
    setToken(token);
    setAgentId(agentId);
    setAgent({ token, agentId });
  }, []);

  const logout = useCallback(() => {
    clearToken();
    clearAgentId();
    setAgent(null);
  }, []);

  return (
    <AuthContext.Provider value={{ agent, login, logout, isAuthenticated: !!agent }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

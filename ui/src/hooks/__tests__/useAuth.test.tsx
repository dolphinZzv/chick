import { renderHook, act } from "@testing-library/react";
import { type ReactNode } from "react";
import { AuthProvider, useAuth } from "@/hooks/useAuth";

vi.mock("@/lib/auth", () => {
  const fns = {
    getToken: vi.fn(() => localStorage.getItem("token")),
    setToken: vi.fn((token: string) => localStorage.setItem("token", token)),
    clearToken: vi.fn(() => localStorage.removeItem("token")),
    getAgentId: vi.fn(() => localStorage.getItem("agentId")),
    setAgentId: vi.fn((agentId: string) => localStorage.setItem("agentId", agentId)),
    clearAgentId: vi.fn(() => localStorage.removeItem("agentId")),
  };
  return fns;
});

import { setToken, clearToken } from "@/lib/auth";

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe("AuthProvider + useAuth", () => {
  it("throws when used outside AuthProvider", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow("useAuth must be used within AuthProvider");
    consoleSpy.mockRestore();
  });

  it("starts unauthenticated when localStorage is empty", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.agent).toBeNull();
  });

  it("restores session from localStorage", () => {
    localStorage.setItem("token", "saved-token");
    localStorage.setItem("agentId", "agent-123");

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.agent).toEqual({ token: "saved-token", agentId: "agent-123" });
  });

  it("login stores token and sets authenticated state", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      result.current.login("new-token", "agent-456");
    });

    expect(setToken).toHaveBeenCalledWith("new-token");
    expect(localStorage.getItem("agentId")).toBe("agent-456");
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.agent).toEqual({ token: "new-token", agentId: "agent-456" });
  });

  it("logout clears token and sets unauthenticated state", () => {
    localStorage.setItem("token", "tok");
    localStorage.setItem("agentId", "aid");

    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      result.current.logout();
    });

    expect(clearToken).toHaveBeenCalled();
    expect(localStorage.getItem("agentId")).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.agent).toBeNull();
  });
});

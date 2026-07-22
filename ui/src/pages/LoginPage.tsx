import { useEffect, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { gql } from "@/lib/graphql";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Mode = "login" | "register";

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [externalId, setExternalId] = useState("");
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [allowRegister, setAllowRegister] = useState(false);

  const [regName, setRegName] = useState("");
  const [regExternalId, setRegExternalId] = useState("");
  const [regSecret, setRegSecret] = useState("");

  useEffect(() => {
    gql(`query { allowHumanRegistration }`).then(json => {
      if (!json.errors) setAllowRegister(json.data.allowHumanRegistration);
    });
  }, []);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const json = await gql(
        `mutation loginAgent($e: String!, $s: String!) {
          loginAgent(externalID: $e, secret: $s) { token agent { id } }
        }`,
        { e: externalId, s: secret }
      );
      if (json.errors) { setError(json.errors[0].message); return; }
      const { token, agent } = json.data.loginAgent;
      login(token, agent.id);
      navigate("/", { replace: true });
    } catch { setError("网络错误，请重试"); }
    finally { setLoading(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regExternalId.trim() || !regSecret.trim()) return;
    setError("");
    setLoading(true);
    try {
      const json = await gql(
        `mutation registerAgent($n: String!, $e: String!, $s: String!) {
          registerAgent(name: $n, kind: human, externalID: $e, secret: $s) { agent { id } token }
        }`,
        { n: regName, e: regExternalId, s: regSecret }
      );
      if (json.errors) { setError(json.errors[0].message); return; }
      const { token, agent } = json.data.registerAgent;
      login(token, agent.id);
      navigate("/", { replace: true });
    } catch { setError("网络错误，请重试"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-xs space-y-8">
        <div className="text-center space-y-1">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">
            MG
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Morning Glory</h1>
          <p className="text-sm text-muted-foreground">多 Agent 协作平台</p>
        </div>

        {allowRegister && (
          <div className="flex items-center gap-6 border-b border-border">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                type="button"
                className={cn(
                  "pb-2.5 text-sm border-b-2 -mb-px transition-colors",
                  mode === m
                    ? "border-foreground font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
                onClick={() => { setMode(m); setError(""); }}
              >
                {m === "login" ? "登录" : "注册"}
              </button>
            ))}
          </div>
        )}

        {mode === "login" ? (
          <form onSubmit={handleLogin} className="space-y-3.5">
            <Input
              value={externalId}
              onChange={(e) => setExternalId(e.target.value)}
              placeholder="账户"
              required
              autoFocus
            />
            <Input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="密码"
              required
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "..." : "登录"}
            </Button>
          </form>
        ) : allowRegister ? (
          <form onSubmit={handleRegister} className="space-y-3.5">
            <Input
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              placeholder="名称"
              required
              autoFocus
            />
            <Input
              value={regExternalId}
              onChange={(e) => setRegExternalId(e.target.value)}
              placeholder="账户"
              required
            />
            <Input
              type="password"
              value={regSecret}
              onChange={(e) => setRegSecret(e.target.value)}
              placeholder="密码"
              required
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "..." : "注册"}
            </Button>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">注册功能未开启</p>
        )}
      </div>
    </div>
  );
}

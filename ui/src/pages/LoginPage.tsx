import { useEffect, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { gql } from "@/lib/graphql";
import { useAuth } from "@/hooks/useAuth";

type Mode = "login" | "register";

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [externalId, setExternalId] = useState("");
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
      <div className="w-full max-w-xs">
        <div className="text-center mb-8">
          <h1 className="text-lg font-medium">Chick</h1>
          <p className="mt-1 text-sm text-muted-foreground">协作平台</p>
        </div>

        <div className="flex gap-4 mb-6">
          <button
            type="button"
            className={`text-sm ${mode === "login" ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => { setMode("login"); setError(""); }}
          >
            登录
          </button>
          {allowRegister && (
            <button
              type="button"
              className={`text-sm ${mode === "register" ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => { setMode("register"); setError(""); }}
            >
              注册
            </button>
          )}
        </div>

        {mode === "login" ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              value={externalId}
              onChange={(e) => setExternalId(e.target.value)}
              placeholder="账户"
              required
              autoFocus
              className="w-full border-b bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-foreground transition-colors"
            />
            <div>
              <input
                type={showPassword ? "text" : "password"}
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="密码"
                required
                className="w-full border-b bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-foreground transition-colors"
              />
              <button
                type="button"
                className="mt-1 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "隐藏" : "显示"}密码
              </button>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded py-2 text-sm bg-foreground text-background hover:opacity-80 transition-opacity disabled:opacity-50"
            >
              {loading ? "..." : "登录"}
            </button>
          </form>
        ) : allowRegister ? (
          <form onSubmit={handleRegister} className="space-y-4">
            <input
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              placeholder="名称"
              required
              autoFocus
              className="w-full border-b bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-foreground transition-colors"
            />
            <input
              value={regExternalId}
              onChange={(e) => setRegExternalId(e.target.value)}
              placeholder="账户"
              required
              className="w-full border-b bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-foreground transition-colors"
            />
            <div>
              <input
                type={showPassword ? "text" : "password"}
                value={regSecret}
                onChange={(e) => setRegSecret(e.target.value)}
                placeholder="密码"
                required
                className="w-full border-b bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-foreground transition-colors"
              />
              <button
                type="button"
                className="mt-1 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "隐藏" : "显示"}密码
              </button>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded py-2 text-sm bg-foreground text-background hover:opacity-80 transition-opacity disabled:opacity-50"
            >
              {loading ? "..." : "注册"}
            </button>
          </form>
        ) : (
          <p className="text-xs text-muted-foreground">注册功能未开启</p>
        )}
      </div>
    </div>
  );
}

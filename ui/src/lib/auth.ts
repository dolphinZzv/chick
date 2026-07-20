const TOKEN_KEY = "token"
const AGENT_ID_KEY = "agentId"

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export function getAgentId(): string | null {
  return localStorage.getItem(AGENT_ID_KEY)
}

export function setAgentId(agentId: string) {
  localStorage.setItem(AGENT_ID_KEY, agentId)
}

export function clearAgentId() {
  localStorage.removeItem(AGENT_ID_KEY)
}

export function redirectToLogin() {
  clearToken()
  clearAgentId()
  window.location.href = "/login"
}

export function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" }
  const token = getToken()
  if (token) h["Authorization"] = `Bearer ${token}`
  return h
}

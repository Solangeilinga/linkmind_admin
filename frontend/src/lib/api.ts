const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("adminToken");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    window.location.href = "/login";
    throw new Error("Session expirée");
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur API");
  return data;
}

export const api = {
  get:    <T>(path: string)                  => request<T>(path),
  post:   <T>(path: string, body: unknown)   => request<T>(path, { method: "POST",   body: JSON.stringify(body) }),
  patch:  <T>(path: string, body: unknown)   => request<T>(path, { method: "PATCH",  body: JSON.stringify(body) }),
  delete: <T>(path: string, body?: unknown)  => request<T>(path, { method: "DELETE", body: body ? JSON.stringify(body) : undefined }),
};

export const saveSession = (token: string, admin: object) => {
  localStorage.setItem("adminToken", token);
  localStorage.setItem("adminUser", JSON.stringify(admin));
};

export const clearSession = () => {
  localStorage.removeItem("adminToken");
  localStorage.removeItem("adminUser");
};

export const getAdmin = () => {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("adminUser");
  return raw ? JSON.parse(raw) : null;
};

export const isAuthenticated = () => !!getToken();

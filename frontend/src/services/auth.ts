import api from "./http";

export type LoginInput = {
  email: string;
  password: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "INSTRUCTOR" | "REPORTER";
  providerId?: string | null;
};

export function getRefresh() {
  return localStorage.getItem("refreshToken");
}

export function setRefresh(refreshToken: string) {
  localStorage.setItem("refreshToken", refreshToken);
}

export function clearRefresh() {
  localStorage.removeItem("refreshToken");
}

export async function login(data: LoginInput) {
  const response = await api.post("/auth/login", data);
  const { token, user, refreshToken } = response.data as {
    token: string;
    user: User;
    refreshToken: string;
  };
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
  setRefresh(refreshToken);
  return user;
}

export async function refresh() {
  const refreshToken = getRefresh();
  if (!refreshToken) throw new Error("No refresh token");
  const { data } = await api.post("/auth/refresh", { refreshToken });
  const { token, refreshToken: nextRefresh } = data as { token: string; refreshToken: string };
  localStorage.setItem("token", token);
  setRefresh(nextRefresh);
  return token;
}

export async function logout() {
  const refreshToken = getRefresh();
  if (refreshToken) {
    try {
      await api.post("/auth/logout", { refreshToken });
    } catch (error) {
      console.warn("No se pudo revocar el refresh token", error);
    }
  }
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  clearRefresh();
}

export function getCurrentUser() {
  const raw = localStorage.getItem("user");
  return raw ? (JSON.parse(raw) as User) : null;
}

import api from "./http";

export type LoginInput = { email: string; password: string };
export type User = { id: string; name: string; email: string; role: "ADMIN"|"INSTRUCTOR"|"REPORTER"; providerId?: string|null };

export function getRefresh(){ return localStorage.getItem("refreshToken"); }
export function setRefresh(rt: string){ localStorage.setItem("refreshToken", rt); }
export function clearRefresh(){ localStorage.removeItem("refreshToken"); }

export async function login(data: LoginInput){
  const res = await api.post("/auth/login", data);
  const { token, user, refreshToken } = res.data as { token: string; user: User; refreshToken: string };
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
  setRefresh(refreshToken);
  return user;
}

export async function refresh(){
  const rt = getRefresh();
  if(!rt) throw new Error("No refresh token");
  const { data } = await api.post("/auth/refresh", { refreshToken: rt });
  const { token, refreshToken } = data as { token: string; refreshToken: string };
  localStorage.setItem("token", token);
  setRefresh(refreshToken);
  return token;
}

export async function logout(){
  const rt = getRefresh();
  try{ await api.post("/auth/logout", { refreshToken: rt }); }catch{}
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  clearRefresh();
}

export function getCurrentUser(){
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) as User : null;
}

import axios, { AxiosHeaders, type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { refresh } from "./auth";

const baseURL = (import.meta.env.VITE_API_BASE_URL ?? "").trim() || "/api";

const api = axios.create({
  baseURL,
  withCredentials: false,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    (config.headers as AxiosHeaders).set("Authorization", `Bearer ${token}`);
  }
  return config;
});

interface RetryConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

type QueueEntry = { resolve: () => void; reject: (reason?: unknown) => void };

let refreshing = false;
let queue: QueueEntry[] = [];

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = (error.config ?? {}) as RetryConfig;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        if (!refreshing) {
          refreshing = true;
          await refresh();
          refreshing = false;
          queue.forEach((entry) => entry.resolve());
          queue = [];
        } else {
          await new Promise<void>((resolve, reject) => queue.push({ resolve, reject }));
        }
        const token = localStorage.getItem("token");
        if (token && original.headers) {
          (original.headers as AxiosHeaders).set("Authorization", `Bearer ${token}`);
        }
        return api(original);
      } catch (refreshError) {
        queue.forEach((entry) => entry.reject(refreshError));
        queue = [];
        refreshing = false;
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;

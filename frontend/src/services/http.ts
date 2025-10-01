import axios from "axios";
import { refresh } from "./auth";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: false,
  timeout: 15000
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshing = false as boolean;
let queue: { resolve: (v?: any)=>void; reject: (e: any)=>void }[] = [];

api.interceptors.response.use((r) => r, async (err) => {
  const original: any = err.config || {};
  if(err.response?.status === 401 && !original._retry){
    original._retry = true;
    try{
      if(!refreshing){
        refreshing = true;
        await refresh();
        refreshing = false;
        queue.forEach(p => p.resolve(true));
        queue = [];
      }else{
        await new Promise((resolve, reject) => queue.push({ resolve, reject }));
      }
      original.headers = original.headers || {};
      original.headers.Authorization = `Bearer ${localStorage.getItem("token")}`;
      return api(original);
    }catch(e){
      queue.forEach(p => p.reject(e));
      queue = [];
      refreshing = false;
      return Promise.reject(e);
    }
  }
  return Promise.reject(err);
});

export default api;

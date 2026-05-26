import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const TOKEN_KEY = "jandia_admin_token";

export const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
};
export const setToken = (t) => {
  try { localStorage.setItem(TOKEN_KEY, t); } catch { /* ignore */ }
};
export const clearToken = () => {
  try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
};

let _onAuthLost = null;
export const onAuthLost = (cb) => { _onAuthLost = cb; };

// Attach token to every request and react on 401s.
axios.interceptors.request.use((config) => {
  const t = getToken();
  if (t) {
    config.headers = config.headers || {};
    if (!config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${t}`;
    }
  }
  return config;
});

axios.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    const url = err?.config?.url || "";
    if (status === 401 && !url.includes("/api/admin/login")) {
      if (getToken()) {
        clearToken();
        if (typeof _onAuthLost === "function") _onAuthLost();
      }
    }
    return Promise.reject(err);
  }
);

export async function fetchAuthStatus() {
  const res = await axios.get(`${API}/admin/status`);
  return res.data; // { configured: bool }
}

export async function login(password) {
  const res = await axios.post(`${API}/admin/login`, { password });
  if (res.data?.token) setToken(res.data.token);
  return res.data;
}

export async function checkAuth() {
  const res = await axios.get(`${API}/admin/me`);
  return res.data;
}

export function logout() {
  clearToken();
}

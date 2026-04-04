import axios from "axios";

let accessTokenGetter = () => null;
let unauthorizedHandler = null;

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = accessTokenGetter();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = String(error.config?.url || "").includes("/auth/login");
    if (error.response?.status === 401 && !isLoginRequest && unauthorizedHandler) {
      unauthorizedHandler(error);
    }

    return Promise.reject(error);
  }
);

export function setApiAccessTokenGetter(getter) {
  accessTokenGetter = getter || (() => null);
}

export function setApiUnauthorizedHandler(handler) {
  unauthorizedHandler = handler || null;
}

export default api;

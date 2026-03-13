import axios from "axios";
import Cookies from "js-cookie";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

interface RetryableRequest {
  _retry?: boolean;
}

let refreshRequest: Promise<string | null> | null = null;

const redirectToLogin = () => {
  Cookies.remove("accessToken");
  Cookies.remove("refreshToken");
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
};

const getFreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = Cookies.get("refreshToken");
  if (!refreshToken) {
    return null;
  }

  if (!refreshRequest) {
    refreshRequest = axios
      .post(`${API_URL}/auth/refresh`, { refreshToken })
      .then((res) => {
        const nextAccessToken = res.data?.accessToken as string | undefined;
        const nextRefreshToken = res.data?.refreshToken as string | undefined;

        if (!nextAccessToken || !nextRefreshToken) {
          return null;
        }

        Cookies.set("accessToken", nextAccessToken, { expires: 7 });
        Cookies.set("refreshToken", nextRefreshToken, { expires: 30 });
        return nextAccessToken;
      })
      .catch(() => null)
      .finally(() => {
        refreshRequest = null;
      });
  }

  return refreshRequest;
};

api.interceptors.request.use((config) => {
  const token = Cookies.get("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as
      | (typeof error.config & RetryableRequest)
      | undefined;
    const status = error.response?.status as number | undefined;

    if (status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      const freshToken = await getFreshAccessToken();

      if (freshToken) {
        originalRequest.headers.Authorization = `Bearer ${freshToken}`;
        return api(originalRequest);
      }
    }

    if (status === 401) {
      redirectToLogin();
    }

    return Promise.reject(error);
  },
);

export default api;

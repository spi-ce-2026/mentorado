import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiBaseUrl } from "./env";
import { ErrorTypes, parseError } from "./errorHandler";
import { DeviceEventEmitter } from "react-native";
import { log } from "./logger";

const baseURL = getApiBaseUrl();

export const api = axios.create({ baseURL });

/**
 * Verifica se deve tentar refresh token
 */
export const shouldRefreshToken = error => {
  const parsedError = parseError(error);
  return parsedError.type === ErrorTypes.UNAUTHORIZED && parsedError.statusCode === 401;
};

/**
 * Tenta fazer refresh do token automaticamente
 */
export const refreshTokenIfNeeded = async () => {
  try {
    const refreshToken = await AsyncStorage.getItem("refreshToken");
    if (!refreshToken) {
      return false;
    }

    const response = await authService.refresh(refreshToken);
    if (response?.data?.accessToken) {
      return true;
    }
    return false;
  } catch (error) {
    log("Api.js -> refreshTokenIfNeeded -> Erro ao fazer refresh do token:", error);
    // Se o refresh falhar, limpar tokens
    await AsyncStorage.multiRemove(["token", "refreshToken"]);
    return false;
  }
};

// Interceptor de requisição: adiciona token
api.interceptors.request.use(
  async config => {
    const token = await AsyncStorage.getItem("token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Log da requisição para DevTools
    if (__DEV__) {
      log(`[API REQUEST] ${config.method?.toUpperCase()} ${config.url}`, {
        baseURL: config.baseURL,
        headers: config.headers,
        params: config.params,
        data: config.data,
      });
    }
    return config;
  },
  error => {
		log("Api.js -> request interceptor -> Erro na requisição:", error);
    return Promise.reject(error);
  },
);

// Interceptor de resposta: trata erros e refresh token
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  response => {
    // Log da resposta para DevTools
    if (__DEV__) {
      log(`[API RESPONSE] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
      });
    }
    return response;
  },
  async error => {
    const originalRequest = error.config;

    // [Correção 3.3] Um 401 da própria chamada de refresh não pode entrar no fluxo
    // abaixo: com isRefreshing = true ela ia para a fila esperando o refresh que é ela
    // mesma, a promise nunca resolvia e o app travava (refresh token expira em 24h).
    // Rejeitar aqui faz refreshTokenIfNeeded() retornar false e o app deslogar.
    if (originalRequest?.url?.includes("/auth/refresh")) {
      return Promise.reject(error);
    }

    // Se o erro é 401 e ainda não tentamos refresh
    if (shouldRefreshToken(error) && !originalRequest._retry) {
      if (isRefreshing) {
        // Se já está fazendo refresh, adicionar à fila
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshed = await refreshTokenIfNeeded();
        if (refreshed) {
          const newToken = await AsyncStorage.getItem("token");
          processQueue(null, newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        } else {
          // Refresh falhou, fazer logout
          processQueue(error, null);
          await AsyncStorage.multiRemove(["token", "refreshToken"]);
          DeviceEventEmitter.emit("auth:changed");
          return Promise.reject(error);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        await AsyncStorage.multiRemove(["token", "refreshToken"]);
        DeviceEventEmitter.emit("auth:changed");
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Para outros erros, apenas rejeitar
    return Promise.reject(error);
  },
);

// ============================================
// AUTH SERVICE - Autenticação e Usuários
// ============================================

export const authService = {
  // Login
  login: async data => {
    log("authService.login -> data -> ", data);
    const response = await api.post("/auth/login", data);
    log("authService.login -> response -> ", response);
    if (response.data.accessToken) {
      await AsyncStorage.setItem("token", response.data.accessToken);
      await AsyncStorage.setItem("refreshToken", response.data.refreshToken);
    }
    return response;
  },

  // Renovar token
  refresh: async refreshToken => {
    const response = await api.post("/auth/refresh", { refreshToken });
    if (response.data.accessToken) {
      await AsyncStorage.setItem("token", response.data.accessToken);
      await AsyncStorage.setItem("refreshToken", response.data.refreshToken);
    }
    return response;
  },

  // Logout
  logout: async () => {
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("refreshToken");
  },

  // Obter dados do usuário autenticado
  getMe: () => api.get("/users/me"),

  // Atualizar token FCM
  updateFcmToken: (fcmToken, deviceId) => api.put("/users/me/fcm-token", { fcmToken, deviceId }),

  // Listar todos os usuários (Admin)
  listUsers: params => api.get("/users", { params }),

  // Atualizar status do usuário (Admin)
  updateUserStatus: (userId, status) => api.put(`/users/${userId}/status`, { status }),
};

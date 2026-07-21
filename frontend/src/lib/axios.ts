import axios from "axios";
import { useAuthStore } from "../store/useAuthStore";

// Nginx proxies this same-origin path to FastAPI in production. A relative
// fallback prevents browsers from trying to reach the server's private :8000 port.
const fallbackApiUrl = "/api/v1";
const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

export const api = axios.create({
	baseURL: (configuredApiUrl || fallbackApiUrl).replace(/\/$/, ""),
	headers: {
		"Content-Type": "application/json",
	},
});

api.interceptors.request.use(
	(config) => {
		const token = useAuthStore.getState().token;
		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		}
		return config;
	},
	(error) => Promise.reject(error)
);

api.interceptors.response.use(
	(response) => response,
	(error) => {
		if (error.response?.status === 401) {
			useAuthStore.getState().logout();
			window.location.href = "/auth";
		}
		return Promise.reject(error);
	}
);

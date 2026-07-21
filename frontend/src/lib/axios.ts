import axios from "axios";
import { useAuthStore } from "../store/useAuthStore";

const fallbackApiUrl = `${window.location.protocol}//${window.location.hostname}:8000/api/v1`;
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

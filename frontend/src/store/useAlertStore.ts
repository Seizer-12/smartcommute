import { create } from "zustand";

export type AlertType = "success" | "error" | "warning" | "info";

interface Alert {
	id: number;
	message: string;
	type: AlertType;
}

interface AlertState {
	alert: Alert | null;
	showAlert: (message: string, type?: AlertType) => void;
	dismissAlert: (id?: number) => void;
}

let nextAlertId = 0;

export const useAlertStore = create<AlertState>((set) => ({
	alert: null,
	showAlert: (message, type = "info") => set((state) => {
		if (state.alert?.message === message && state.alert.type === type) return state;
		const nextAlert = { id: ++nextAlertId, message, type };
		return { alert: nextAlert };
	}),
	dismissAlert: (id) => set((state) => {
		if (id !== undefined && state.alert?.id !== id) return state;
		return { alert: null };
	}),
}));

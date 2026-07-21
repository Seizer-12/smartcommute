import { create } from "zustand";

export type AlertType = "success" | "error" | "info";

interface Alert {
	id: number;
	message: string;
	type: AlertType;
}

interface AlertState {
	alert: Alert | null;
	showAlert: (message: string, type?: AlertType) => void;
	dismissAlert: () => void;
}

export const useAlertStore = create<AlertState>((set) => ({
	alert: null,
	showAlert: (message, type = "info") => set({ alert: { id: Date.now(), message, type } }),
	dismissAlert: () => set({ alert: null }),
}));

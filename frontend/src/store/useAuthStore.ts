import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface UserPayload {
	id: number;
	username: string;
	full_name: string;
	email: string;
	role: "commuter" | "driver" | "admin";
	wallet_balance: number;
	withdrawal_balance: number;
	is_available: boolean;
	qr_code_uid: string | null;
	bus_type?: string | null;
}

interface AuthState {
	user: UserPayload | null;
	token: string | null;
	isAuthenticated: boolean;
	authenticate: (user: UserPayload, token: string) => void;
	setToken: (token: string) => void;
	setUser: (user: UserPayload) => void;
	logout: () => void;
}

export const useAuthStore = create<AuthState>()(
	persist(
		(set) => ({
			user: null,
			token: null,
			isAuthenticated: false,
			authenticate: (user, token) => set({ user, token, isAuthenticated: true }),
			setToken: (token) => set({ token, isAuthenticated: true }),
			setUser: (user) => set({ user, isAuthenticated: true }),
			logout: () => set({ user: null, token: null, isAuthenticated: false }),
		}),
		{
			name: "smartcommute-auth-storage", // Saves to localStorage seamlessly
		}
	)
);

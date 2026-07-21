import { useEffect } from "react";
import { useAuthStore, type UserPayload } from "../store/useAuthStore";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/axios";
import { Home, History, Settings, LogOut, Bus, Wallet, ShieldCheck } from "lucide-react";
import { Link, useLocation, Outlet } from "react-router-dom"; // 1. Outlet imported here

export default function DashboardLayout() {
	// 2. No more { children } here!
	const { user, logout, setUser } = useAuthStore();
	const location = useLocation();

	const isDriver = user?.role === "driver";
	const isAdmin = user?.role === "admin";
	const dashPath = isAdmin ? "/admin" : isDriver ? "/driver" : "/dashboard";

	const { data: refreshedUser } = useQuery({
		queryKey: ["account", "me", user?.id],
		queryFn: async () => {
			const response = await api.get<UserPayload>("/account/me");
			return response.data;
		},
		enabled: isDriver,
		refetchInterval: 30000,
	});

	useEffect(() => {
		if (refreshedUser && user?.id === refreshedUser.id) {
			setUser(refreshedUser);
		}
	}, [refreshedUser, setUser, user?.id]);

	const navItems = isAdmin
		? [
			{ icon: ShieldCheck, label: "Admin", path: dashPath },
			{ icon: Settings, label: "Settings", path: "/dashboard/settings" },
		]
		: [
			{ icon: Home, label: "Home", path: dashPath },
			{ icon: Wallet, label: "Wallet", path: "/dashboard/wallet" },
			{ icon: History, label: "Transactions", path: "/dashboard/history" },
			{ icon: Settings, label: "Settings", path: "/dashboard/settings" },
		];

	return (
		<div className="min-h-screen flex flex-col md:flex-row font-sans text-slate-900 bg-transparent">
			{/* Desktop Sidebar */}
			<aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 fixed h-full z-40">
				<div className="p-6 flex items-center gap-2 border-b border-slate-100">
					<div className="bg-blue-600 p-2 rounded-lg">
						<Bus className="w-5 h-5 text-white" />
					</div>
					<span className="text-xl font-heading font-black tracking-tight text-slate-900">
						SmartCommute
					</span>
				</div>

				<div className="flex flex-col flex-1 px-4 py-6 space-y-2">
					{navItems.map((item, idx) => {
						const Icon = item.icon;
						const isActive = location.pathname === item.path;
						return (
							<Link
								key={idx}
								to={item.path}
								className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
									isActive
										? "bg-blue-50 text-blue-600"
										: "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
								}`}
							>
								<Icon className="w-5 h-5" />
								{item.label}
							</Link>
						);
					})}
				</div>

				<div className="p-4 border-t border-slate-100">
					<button
						onClick={logout}
						className="flex items-center gap-3 w-full px-4 py-3 text-sm font-bold text-red-500 rounded-xl hover:bg-red-50 transition-colors"
					>
						<LogOut className="w-5 h-5" />
						Logout
					</button>
				</div>
			</aside>

			{/* Main Content Area */}
			<main className="flex-1 md:ml-64 relative pb-20 md:pb-0 min-h-screen">
				{/* Mobile Header */}
				<div className="md:hidden bg-white px-4 py-4 border-b border-slate-200 flex justify-between items-center sticky top-0 z-30">
					<div className="flex items-center gap-2">
						<div className="bg-blue-600 p-1.5 rounded-md">
							<Bus className="w-4 h-4 text-white" />
						</div>
						<span className="text-lg font-heading font-black tracking-tight text-slate-900">
							SmartCommute
						</span>
					</div>
					<button
						onClick={logout}
						className="p-2 text-slate-400 hover:text-red-500 transition-colors"
					>
						<LogOut className="w-5 h-5" />
					</button>
				</div>

				<div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
					{/* 3. THIS IS THE MAGIC HOLE React Router uses to drop your pages into the layout */}
					<Outlet />
				</div>
			</main>

			{/* Mobile Bottom Navigation */}
			<nav className="md:hidden fixed bottom-0 w-full bg-white border-t border-slate-200 flex justify-around p-3 z-40 pb-6">
				{navItems.map((item, idx) => {
					const Icon = item.icon;
					const isActive = location.pathname === item.path;
					return (
						<Link
							key={idx}
							to={item.path}
							className={`flex flex-col items-center p-2 rounded-lg ${
								isActive ? "text-blue-600" : "text-slate-400"
							}`}
						>
							<Icon className={`w-6 h-6 ${isActive ? "mb-1" : ""}`} />
							{isActive && (
								<span className="text-[10px] font-bold">{item.label}</span>
							)}
						</Link>
					);
				})}
			</nav>
		</div>
	);
}

import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import {
	LayoutDashboard,
	Wallet,
	History,
	Settings,
	LogOut,
	Route as RouteIcon,
} from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";

export default function DashboardLayout() {
	const navigate = useNavigate();
	const location = useLocation();
	const { user, logout } = useAuthStore();

	const handleLogout = () => {
		logout();
		navigate("/");
	};

	const navLinks = [
		{ name: "Overview", path: "/dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
		{ name: "Wallet", path: "/dashboard/wallet", icon: <Wallet className="w-5 h-5" /> },
		{ name: "Ride History", path: "/dashboard/history", icon: <History className="w-5 h-5" /> },
		{ name: "Settings", path: "/dashboard/settings", icon: <Settings className="w-5 h-5" /> },
	];

	const activeColor =
		user?.role === "commuter" ? "text-blue-600 bg-blue-50" : "text-amber-600 bg-amber-50";
	const hoverColor =
		user?.role === "commuter"
			? "hover:bg-blue-50/50 hover:text-blue-600"
			: "hover:bg-amber-50/50 hover:text-amber-600";

	return (
		<div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
			{/* Desktop Sidebar */}
			<aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 fixed h-full z-20">
				<div className="p-6 border-b border-slate-100 flex items-center">
					<Link to="/" className="inline-block outline-none">
						<div
							className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm transition-transform hover:scale-105 ${
								user?.role === "commuter"
									? "bg-gradient-to-br from-blue-600 to-sky-400 shadow-blue-500/20"
									: "bg-gradient-to-br from-amber-500 to-orange-400 shadow-amber-500/20"
							}`}
						>
							<RouteIcon className="w-5 h-5 stroke-[2.5]" />
						</div>
					</Link>
				</div>

				<div className="p-6 pb-2">
					<p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">
						Main Menu
					</p>
					<nav className="space-y-1.5">
						{navLinks.map((link) => {
							const isActive = location.pathname === link.path;
							return (
								<Link
									key={link.name}
									to={link.path}
									className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
										isActive ? activeColor : `text-slate-600 ${hoverColor}`
									}`}
								>
									{link.icon}
									<span>{link.name}</span>
								</Link>
							);
						})}
					</nav>
				</div>

				<div className="mt-auto p-6 border-t border-slate-100">
					<div className="flex items-center space-x-3 mb-6">
						<div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0">
							<span className="font-bold text-slate-600 text-sm">
								{user?.full_name.charAt(0)}
							</span>
						</div>
						<div className="overflow-hidden">
							<p className="text-sm font-bold text-slate-900 truncate">
								{user?.full_name}
							</p>
							<p className="text-xs text-slate-500 capitalize">
								{user?.role} Account
							</p>
						</div>
					</div>
					<button
						onClick={handleLogout}
						className="flex items-center space-x-3 text-sm font-semibold text-red-500 hover:text-red-600 hover:bg-red-50 w-full px-4 py-3 rounded-xl transition-colors outline-none focus:ring-2 focus:ring-red-100"
					>
						<LogOut className="w-5 h-5" />
						<span>Sign Out</span>
					</button>
				</div>
			</aside>

			{/* Mobile Header (Visible only on small screens) */}
			<header className="md:hidden bg-white border-b border-slate-200 p-4 sticky top-0 z-30 flex justify-between items-center">
				<Link to="/" className="inline-block outline-none">
					<div
						className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm ${
							user?.role === "commuter"
								? "bg-gradient-to-br from-blue-600 to-sky-400"
								: "bg-gradient-to-br from-amber-500 to-orange-400"
						}`}
					>
						<RouteIcon className="w-4 h-4 stroke-[2.5]" />
					</div>
				</Link>
				<button
					onClick={handleLogout}
					className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg outline-none"
				>
					<LogOut className="w-5 h-5" />
				</button>
			</header>

			{/* Main Content Area */}
			<main className="flex-1 md:ml-64 p-4 sm:p-8 w-full max-w-6xl mx-auto">
				<Outlet />
			</main>

			{/* Mobile Bottom Nav (Visible only on small screens) */}
			<nav className="md:hidden fixed bottom-0 w-full bg-white border-t border-slate-200 flex justify-around p-3 z-30 pb-safe">
				{navLinks.slice(0, 3).map((link) => {
					const isActive = location.pathname === link.path;
					return (
						<Link
							key={link.name}
							to={link.path}
							className={`flex flex-col items-center p-2 rounded-xl ${
								isActive ? activeColor : "text-slate-500"
							}`}
						>
							{link.icon}
							<span className="text-[10px] font-bold mt-1">{link.name}</span>
						</Link>
					);
				})}
			</nav>
		</div>
	);
}

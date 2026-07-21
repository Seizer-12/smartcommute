import { Route } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";

export default function Navbar() {
	const navigate = useNavigate();
	const location = useLocation();
	const { isAuthenticated, user, logout } = useAuthStore();

	const handleScroll = (id: string) => {
		if (location.pathname !== "/") {
			navigate("/");
			setTimeout(() => {
				const element = document.getElementById(id);
				if (element) element.scrollIntoView({ behavior: "smooth", block: "start" });
			}, 100);
			return;
		}
		const element = document.getElementById(id);
		if (element) {
			element.scrollIntoView({ behavior: "smooth", block: "start" });
		}
	};

	return (
		<header className="border-b border-slate-200 bg-white/85 backdrop-blur-xl sticky top-0 z-50 px-4 sm:px-6 py-3 sm:py-4 transition-all w-full shadow-sm">
			<div className="max-w-7xl mx-auto flex justify-between items-center w-full">
				{/* Engineered SmartCommute Logo Block */}
				<Link
					to="/"
					className="flex items-center space-x-2 sm:space-x-3 group cursor-pointer"
					onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
				>
					<div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-blue-600 to-sky-400 flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform shrink-0">
						<Route className="w-4 h-4 sm:w-5 sm:h-5 text-white stroke-[2.5]" />
					</div>
					<div className="flex flex-col">
						<span className="text-base sm:text-lg font-heading font-black tracking-tight text-slate-900 leading-none">
							SMARTCOMMUTE
						</span>
						<span className="text-[9px] sm:text-[10px] text-slate-500 font-mono tracking-widest mt-0.5 uppercase">
							UNILORIN ITS
						</span>
					</div>
				</Link>

				{/* Standard Informative Navigation Anchors */}
				<nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-600">
					<button
						onClick={() => handleScroll("about")}
						className="hover:text-blue-600 transition-colors cursor-pointer"
					>
						About
					</button>
					<button
						onClick={() => handleScroll("features")}
						className="hover:text-blue-600 transition-colors cursor-pointer"
					>
						Features
					</button>
					<button
						onClick={() => handleScroll("process")}
						className="hover:text-blue-600 transition-colors cursor-pointer"
					>
						How It Works
					</button>
				</nav>

				{/* Authentication Gateway Buttons */}
				<div className="flex items-center space-x-3 sm:space-x-4">
					{isAuthenticated ? (
						<>
							<span className="text-xs font-mono text-slate-500 hidden sm:block border-r border-slate-200 pr-4 truncate max-w-[120px]">
								ID: {user?.full_name}
							</span>
							<Link
								to="/dashboard"
								className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer px-2"
							>
								Dashboard
							</Link>
							<button
								onClick={() => {
									logout();
									navigate("/");
								}}
								className="text-sm font-bold text-red-500 hover:text-red-600 transition-colors cursor-pointer px-2"
							>
								Disconnect
							</button>
						</>
					) : (
						<>
							<Link
								to="/auth"
								className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors cursor-pointer px-2 hidden sm:block"
							>
								Sign In
							</Link>
							<Link
								to="/auth"
								className="text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer whitespace-nowrap"
							>
								Get Started
							</Link>
						</>
					)}
				</div>
			</div>
		</header>
	);
}

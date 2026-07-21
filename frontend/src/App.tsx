import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "./store/useAuthStore";

import DashboardLayout from "./components/DashboardLayout";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import CommuterDashboard from "./pages/CommuterDashboard";
import DriverDashboard from "./pages/DriverDashboard";
import History from "./pages/History";
import Wallet from "./pages/Wallet";
import Settings from "./pages/Settings";
import AdminDashboard from "./pages/AdminDashboard";

type Role = "commuter" | "driver" | "admin";

const homeForRole = (role?: Role) => role === "admin" ? "/admin" : role === "driver" ? "/driver" : "/dashboard";

const ProtectedRoute = ({ allowedRoles }: { allowedRoles?: Role[] }) => {
	const { isAuthenticated, user } = useAuthStore();
	if (!isAuthenticated || !user) {
		return <Navigate to="/auth" replace />;
	}
	if (allowedRoles && !allowedRoles.includes(user.role)) {
		return <Navigate to={homeForRole(user.role)} replace />;
	}
	return <Outlet />;
};

export default function App() {
	const { isAuthenticated, user } = useAuthStore();

	return (
		<div className="min-h-screen w-full bg-slate-50 text-slate-900 font-body relative overflow-x-hidden">
			<div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:5rem_5rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_40%,#000_70%,transparent_100%)] pointer-events-none z-0" />

			<div className="relative z-10">
				<Routes>
					<Route path="/" element={<LandingPage />} />
					<Route
						path="/auth"
						element={
							isAuthenticated ? <Navigate to={homeForRole(user?.role)} replace /> : <AuthPage />
						}
					/>

					<Route element={<ProtectedRoute />}>
						<Route element={<DashboardLayout />}>
							<Route element={<ProtectedRoute allowedRoles={["commuter"]} />}>
								<Route path="/dashboard" element={<CommuterDashboard />} />
							</Route>
							<Route element={<ProtectedRoute allowedRoles={["driver"]} />}>
								<Route path="/driver" element={<DriverDashboard />} />
							</Route>
							<Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
								<Route path="/admin" element={<AdminDashboard />} />
							</Route>
							<Route path="/dashboard/history" element={<History />} />
							<Route path="/dashboard/wallet" element={<Wallet />} />
							<Route path="/dashboard/settings" element={<Settings />} />
						</Route>
					</Route>

					<Route path="*" element={<Navigate to="/auth" replace />} />
				</Routes>
			</div>
		</div>
	);
}

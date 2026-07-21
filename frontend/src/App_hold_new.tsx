import { Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "./store/useAuthStore";

// Import our pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import CommuterDashboard from "./pages/CommuterDashboard";
import DriverDashboard from "./pages/DriverDashboard";
import LandingPage from "./pages/LandingPage";
import DashboardLayout from "./components/DashboardLayout";

const queryClient = new QueryClient();

// A simple wrapper to protect routes from unauthenticated users
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
	const { isAuthenticated } = useAuthStore();
	if (!isAuthenticated) {
		return <Navigate to="/login" replace />;
	}
	// We wrap the valid children in the new DashboardLayout
	return <DashboardLayout>{children}</DashboardLayout>;
};

export default function App() {
	const { isAuthenticated, user } = useAuthStore();

	return (
		<QueryClientProvider client={queryClient}>
			<Routes>
				{/* Public Routes */}
				<Route path="/" element={<LandingPage />} />

				<Route
					path="/login"
					element={
						isAuthenticated ? (
							<Navigate
								to={user?.role === "driver" ? "/driver" : "/dashboard"}
								replace
							/>
						) : (
							<Login />
						)
					}
				/>

				<Route
					path="/register"
					element={
						isAuthenticated ? (
							<Navigate
								to={user?.role === "driver" ? "/driver" : "/dashboard"}
								replace
							/>
						) : (
							<Register />
						)
					}
				/>

				{/* Protected Dashboards (Injected into DashboardLayout automatically) */}
				<Route
					path="/dashboard"
					element={
						<ProtectedRoute>
							<CommuterDashboard />
						</ProtectedRoute>
					}
				/>

				<Route
					path="/driver"
					element={
						<ProtectedRoute>
							<DriverDashboard />
						</ProtectedRoute>
					}
				/>

				{/* Fallback for broken links (404 goes to login) */}
				<Route path="*" element={<Navigate to="/login" replace />} />
			</Routes>
		</QueryClientProvider>
	);
}

import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";

interface ProtectedRouteProps {
	allowedRoles?: ("commuter" | "driver" | "admin")[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
	const { isAuthenticated, user } = useAuthStore();
	const location = useLocation();

	// 1. Check if the user is logged in at all
	if (!isAuthenticated || !user) {
		return <Navigate to="/auth" state={{ from: location }} replace />;
	}

	// 2. Check if the route is restricted to specific roles
	if (allowedRoles && !allowedRoles.includes(user.role)) {
		// If a commuter tries to access a driver dashboard, kick them to their own dashboard
		return <Navigate to={user.role === "admin" ? "/admin" : user.role === "driver" ? "/driver" : "/dashboard"} replace />;
	}

	// 3. If authenticated and authorized, render the nested routes
	return <Outlet />;
}

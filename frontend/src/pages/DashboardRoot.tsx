import { useAuthStore } from "../store/useAuthStore";
import CommuterDashboard from "./CommuterDashboard";
import DriverDashboard from "./DriverDashboard";
import { Navigate } from "react-router-dom";

export default function DashboardRoot() {
	const { user } = useAuthStore();

	if (!user) {
		return <Navigate to="/auth" replace />;
	}

	// Intelligently route based on the database role
	return user.role === "driver" ? <DriverDashboard /> : <CommuterDashboard />;
}

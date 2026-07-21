import { useState, type FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { User, Mail, Lock, AlertCircle, AtSign } from "lucide-react";
import { Card } from "../components/Card";
import { RoleSwitcher } from "../components/RoleSwitcher";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { useAuthStore } from "../store/useAuthStore";
import { api } from "../lib/axios";

export default function AuthPage() {
	const navigate = useNavigate();
	const location = useLocation();
	const saveAuthData = useAuthStore((state) => state.authenticate);

	// Read the role passed from the landing page buttons (default to commuter)
	const initialRole = location.state?.role || "commuter";

	const [authMode, setAuthMode] = useState<"login" | "register">("register");
	const [selectedRole, setSelectedRole] = useState<"commuter" | "driver">(initialRole);

	const [fullName, setFullName] = useState("");
	const [username, setUsername] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [busType, setBusType] = useState("shuttle"); // Defaults to shuttle
	const [errorMessage, setErrorMessage] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	// Clear errors when switching modes
	//useEffect(() => {
	//	setErrorMessage("");
	//}, [authMode, selectedRole]);


	type ApiValidationDetail = { msg?: string };
	const getErrorMessage = (err: unknown) => {
		const error = err as { response?: { status?: number; data?: { detail?: string | ApiValidationDetail[] } } };
		const detail = error.response?.data?.detail;
		if (error.response?.status === 422 && Array.isArray(detail)) {
			return detail[0]?.msg || "Validation failed.";
		}
		if (typeof detail === "string") {
			return detail;
		}
		return "Connection error. Please check your network and try again.";
	};

	const handleFormSubmission = async (e: FormEvent) => {
		e.preventDefault();
		setErrorMessage("");
		setIsLoading(true);

		const targetUrl = authMode === "login" ? "/auth/login" : "/auth/register";

		// The backend expects full_name and role for registration, but only email/password for login
		const requestPayload: Record<string, string> =
			authMode === "login"
				? { email, password }
				: { email, password, username: username, full_name: fullName, role: selectedRole };

		// Register drivers with their vehicle type so fares can be calculated.
		if (authMode === "register" && selectedRole === "driver") {
			requestPayload.bus_type = busType;
		}

		try {
			const response = await api.post(targetUrl, requestPayload);

			if (authMode === "login") {
				const fetchedUser = response.data.user;

				if (fetchedUser.role !== "admin" && fetchedUser.role !== selectedRole) {
					setErrorMessage(
						"Account mismatch: this account role does not match the selected login tab."
					);
					setIsLoading(false);
					return;
				}

				saveAuthData(fetchedUser, response.data.access_token);

				// Smart navigation so drivers actually go to /driver
				navigate(fetchedUser.role === "admin" ? "/admin" : fetchedUser.role === "driver" ? "/driver" : "/dashboard");
			} else {
				// Registration success triggers toggle fallback to login sequence
				setAuthMode("login");
				setErrorMessage("Account created successfully! Please sign in.");
			}
		} catch (err: unknown) {
			setErrorMessage(getErrorMessage(err));
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-[calc(100vh-80px)] flex flex-col justify-center max-w-md mx-auto px-4 sm:px-6 py-12 z-10 relative">
			<Card>
				{/* To this: */}
				<RoleSwitcher
					activeRole={selectedRole}
					onChange={(role) => {
						setErrorMessage("");
						setSelectedRole(role);
					}}
				/>

				<div className="mb-8 text-center">
					<h2 className="text-2xl font-heading font-black tracking-tight text-slate-900">
						{authMode === "login" ? "Welcome Back" : "Create an Account"}
					</h2>
					<p className="text-sm text-slate-500 mt-2">
						{authMode === "login"
							? "Sign in to access your "
							: "Register to set up your "}
						<span
							className={`font-bold ${
								selectedRole === "commuter" ? "text-blue-600" : "text-amber-500"
							}`}
						>
							{selectedRole}
						</span>{" "}
						portal.
					</p>
				</div>

				{errorMessage && (
					<div
						className={`mb-6 p-3.5 rounded-xl flex items-start space-x-3 text-sm font-medium ${
							errorMessage.includes("successfully")
								? "bg-emerald-50 text-emerald-700 border border-emerald-200"
								: "bg-red-50 text-red-700 border border-red-200"
						}`}
					>
						<AlertCircle
							className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
								errorMessage.includes("successfully")
									? "text-emerald-500"
									: "text-red-500"
							}`}
						/>
						<span className="leading-relaxed">{errorMessage}</span>
					</div>
				)}

				<form onSubmit={handleFormSubmission} className="space-y-5">
					{authMode === "register" && (
						<>
							<Input
								label="Full Name"
								type="text"
								placeholder="e.g. John Doe"
								value={fullName}
								onChange={(e) => setFullName(e.target.value)}
								icon={<User className="w-4 h-4" />}
								required
							/>

							<Input
								label="Unique Username"
								type="text"
								placeholder="e.g. johndoe123"
								value={username}
								onChange={(e) =>
									setUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))
								}
								icon={<AtSign className="w-4 h-4" />}
								required
							/>
						</>
					)}

					<Input
						label="University Email"
						type="email"
						placeholder="student@unilorin.edu.ng"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						icon={<Mail className="w-4 h-4" />}
						required
					/>

					<Input
						label="Password"
						type="password"
						placeholder="••••••••"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						icon={<Lock className="w-4 h-4" />}
						required
						minLength={8}
						maxLength={64}
					/>

					{authMode === "register" && selectedRole === "driver" && (
						<div className="animate-in fade-in slide-in-from-top-2 duration-300">
							<label className="text-xs font-bold text-slate-700 uppercase ml-1">
								Vehicle Type
							</label>
							<select
								value={busType}
								onChange={(e) => setBusType(e.target.value)}
								className="block w-full px-4 py-3 mt-1 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-slate-900 cursor-pointer"
							>
								<option value="shuttle">Korape Shuttle (₦250 Fare)</option>
								<option value="macopolo">Macopolo Bus (₦150 Fare)</option>
							</select>
						</div>
					)}
					{/* ----------------------------- */}

					<Button
						type="submit"
						roleTheme={selectedRole}
						isLoading={isLoading}
						className="mt-8"
					>
						{authMode === "login" ? "Sign In" : "Register Account"}
					</Button>
				</form>

				<div className="mt-8 text-center pt-6 border-t border-slate-100">
					<p className="text-sm text-slate-500">
						{authMode === "login"
							? "Don't have an account? "
							: "Already have an account? "}
						<button
							type="button"
							onClick={() => {
								setErrorMessage("");
								setAuthMode(authMode === "login" ? "register" : "login");
							}}
							className={`font-bold transition-colors cursor-pointer ${
								selectedRole === "commuter"
									? "text-blue-600 hover:text-blue-800"
									: "text-amber-500 hover:text-amber-700"
							}`}
						>
							{authMode === "login" ? "Register here" : "Sign in"}
						</button>
					</p>
				</div>
			</Card>
		</div>
	);
}

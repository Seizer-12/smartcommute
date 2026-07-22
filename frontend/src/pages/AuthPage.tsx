import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { User, Mail, Lock, AtSign } from "lucide-react";
import { Card } from "../components/Card";
import { RoleSwitcher } from "../components/RoleSwitcher";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { useAuthStore } from "../store/useAuthStore";
import { useAlertStore } from "../store/useAlertStore";
import { api } from "../lib/axios";

type ApiValidationDetail = { msg?: string };

const getErrorMessage = (err: unknown) => {
	const error = err as { response?: { status?: number; data?: { detail?: string | ApiValidationDetail[] } } };
	const detail = error.response?.data?.detail;
	if (error.response?.status === 422 && Array.isArray(detail)) {
		return detail[0]?.msg || "Validation failed.";
	}
	if (typeof detail === "string") return detail;
	return "Connection error. Please check your network and try again.";
};

export default function AuthPage() {
	const navigate = useNavigate();
	const location = useLocation();
	const saveAuthData = useAuthStore((state) => state.authenticate);
	const updateUser = useAuthStore((state) => state.setUser);
	const authenticatedUser = useAuthStore((state) => state.user);
	const showAlert = useAlertStore((state) => state.showAlert);

	// Read the role passed from the landing page buttons (default to commuter)
	const initialRole = location.state?.role || "commuter";
	const resetToken = new URLSearchParams(location.search).get("reset_token");
	const verifyToken = new URLSearchParams(location.search).get("verify_token");

	const [authMode, setAuthMode] = useState<"login" | "register" | "reset">(
		resetToken ? "reset" : "register"
	);
	const [selectedRole, setSelectedRole] = useState<"commuter" | "driver">(initialRole);

	const [fullName, setFullName] = useState("");
	const [username, setUsername] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [busType, setBusType] = useState("shuttle"); // Defaults to shuttle
	const [isLoading, setIsLoading] = useState(false);
	const processedVerificationToken = useRef<string | null>(null);

	useEffect(() => {
		if (!verifyToken || processedVerificationToken.current === verifyToken) return;
		// React Strict Mode runs effects twice in development. Mark the link before
		// requesting verification so its one-time token is never submitted twice.
		processedVerificationToken.current = verifyToken;
		api.post("/auth/email-verification/confirm", { token: verifyToken })
			.then(({ data }) => {
				showAlert(data.message, "success");
				if (authenticatedUser) {
					updateUser({ ...authenticatedUser, email_verified: true });
					navigate("/dashboard/settings", { replace: true });
					return;
				}
				navigate("/auth", { replace: true });
			})
			.catch((error) => {
				const message = getErrorMessage(error);
				showAlert(message, "error");
				navigate("/auth", { replace: true });
			});
	}, [verifyToken, navigate, authenticatedUser, updateUser, showAlert]);

	// Clear errors when switching modes
	//useEffect(() => {
	//	setErrorMessage("");
	//}, [authMode, selectedRole]);


	const handleFormSubmission = async (e: FormEvent) => {
		e.preventDefault();
		setIsLoading(true);

		const targetUrl = authMode === "login" ? "/auth/login" : authMode === "register" ? "/auth/register" : resetToken ? "/auth/password/reset/confirm" : "/auth/password/reset/request";

		// The backend expects full_name and role for registration, but only email/password for login
		const requestPayload: Record<string, string> =
			authMode === "login"
				? { email, password }
				: authMode === "register" ? { email, password, username: username, full_name: fullName, role: selectedRole } : resetToken ? { token: resetToken, new_password: password } : { email };

		// Register drivers with their vehicle type so fares can be calculated.
		if (authMode === "register" && selectedRole === "driver") {
			requestPayload.bus_type = busType;
		}

		try {
			const response = await api.post(targetUrl, requestPayload);

			if (authMode === "login") {
				const fetchedUser = response.data.user;
				// Keep the client closed even if it is accidentally pointed at an
				// older API deployment that has not yet applied the server-side gate.
				if (!fetchedUser.email_verified) {
					const message = "Verify your email before signing in. A verification link has been sent.";
					showAlert(message, "info");
					return;
				}

				if (fetchedUser.role !== "admin" && fetchedUser.role !== selectedRole) {
					const message = "Account mismatch: this account role does not match the selected login tab.";
					showAlert(message, "error");
					setIsLoading(false);
					return;
				}

				saveAuthData(fetchedUser, response.data.access_token);
				showAlert("Signed in successfully.", "success");

				// Smart navigation so drivers actually go to /driver
				navigate(fetchedUser.role === "admin" ? "/admin" : fetchedUser.role === "driver" ? "/driver" : "/dashboard");
			} else if (authMode === "register") {
				// Registration success triggers toggle fallback to login sequence
				setAuthMode("login");
				const message = response.data.email_verification_sent
					? "Account created. A verification link was sent to your email."
					: "Account created, but the verification email could not be sent. Please contact support.";
				showAlert(message, response.data.email_verification_sent ? "success" : "error");
			} else {
				if (resetToken) {
					showAlert(response.data.message, "success");
					navigate("/auth", { replace: true });
				} else {
					showAlert(response.data.message, "info");
				}
			}
		} catch (err: unknown) {
			const message = getErrorMessage(err);
			const isVerificationNotice = message.toLowerCase().includes("verification link");
			showAlert(
				message,
				isVerificationNotice ? "info" : "error"
			);
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
						setSelectedRole(role);
					}}
				/>

				<div className="mb-8 text-center">
					<h2 className="text-2xl font-heading font-black tracking-tight text-slate-900">
						{authMode === "login" ? "Welcome Back" : authMode === "register" ? "Create an Account" : resetToken ? "Set New Password" : "Reset Password"}
					</h2>
					<p className="text-sm text-slate-500 mt-2">
						{authMode === "reset" ? (resetToken ? "Choose a new password for your account." : "Enter your account email and we will send a secure reset link.") : authMode === "login"
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

					{(!resetToken || authMode !== "reset") && <Input
						label="University Email"
						type="email"
						placeholder="student@unilorin.edu.ng"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						icon={<Mail className="w-4 h-4" />}
						required
					/>}

					{authMode !== "reset" || resetToken ? <Input
						label="Password"
						type="password"
						placeholder="••••••••"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						icon={<Lock className="w-4 h-4" />}
						required
						minLength={8}
						maxLength={64}
					/> : null}

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
								<option value="shuttle">Korope Shuttle (₦250 Fare)</option>
								<option value="macopolo">Macopolo Bus (₦150 Fare)</option>
								<option value="cng">CNG Bus (₦250 Fare)</option>
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
						{authMode === "login" ? "Sign In" : authMode === "register" ? "Register Account" : resetToken ? "Reset Password" : "Send Reset Link"}
					</Button>
				</form>

				<div className="mt-8 text-center pt-6 border-t border-slate-100">
					<p className="text-sm text-slate-500">
						{authMode === "login" && <button type="button" onClick={() => setAuthMode("reset")} className="mr-3 font-bold text-blue-600 hover:text-blue-800">Forgot password?</button>}
						{authMode === "login"
							? "Don't have an account? "
							: "Already have an account? "}
						<button
							type="button"
								onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
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

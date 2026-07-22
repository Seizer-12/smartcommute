import { useState, type FormEvent } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { api } from "../lib/axios";
import { User, Mail, Lock, AtSign, Briefcase, Car, Loader2, ArrowRight } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useAlertStore } from "../store/useAlertStore";
import { PasswordVisibilityButton } from "../components/PasswordVisibilityButton";


const getApiErrorMessage = (error: unknown, fallback: string) => {
	const detail = (error as { response?: { data?: { detail?: string } } }).response?.data?.detail;
	return detail || fallback;
};

export default function Register() {
	const { setToken, setUser } = useAuthStore();
	const navigate = useNavigate();
	const showAlert = useAlertStore((state) => state.showAlert);
	const [isLoading, setIsLoading] = useState(false);

	const [fullName, setFullName] = useState("");
	const [email, setEmail] = useState("");
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [role, setRole] = useState<"commuter" | "driver">("commuter");
	const [isPasswordVisible, setIsPasswordVisible] = useState(false);

	const handleRegister = async (e: FormEvent) => {
		e.preventDefault();
		setIsLoading(true);

		try {
			const response = await api.post("/auth/register", {
				full_name: fullName,
				email: email,
				username: username,
				password: password,
				role: role,
			});

			setToken(response.data.access_token);
			setUser(response.data.user);

			if (response.data.user.role === "admin") {
				navigate("/admin");
			} else if (response.data.user.role === "driver") {
				navigate("/driver");
			} else {
				navigate("/dashboard");
			}
		} catch (error: unknown) {
			showAlert(`Registration failed: ${getApiErrorMessage(error, "An error occurred")}`, "error");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
			<div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
				<div className="bg-blue-600 p-8 text-center text-white">
					<h1 className="text-3xl font-heading font-black tracking-tight">
						SmartCommute
					</h1>
					<p className="text-blue-100 text-sm mt-2 font-medium">
						Create your UNILORIN transit account
					</p>
				</div>

				<form onSubmit={handleRegister} className="p-8 space-y-5">
					<div className="flex bg-slate-100 p-1 rounded-xl mb-6">
						<button
							type="button"
							onClick={() => setRole("commuter")}
							className={`flex-1 py-2.5 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
								role === "commuter"
									? "bg-white text-blue-600 shadow-sm"
									: "text-slate-500 hover:text-slate-700"
							}`}
						>
							<Briefcase className="w-4 h-4" /> Commuter
						</button>
						<button
							type="button"
							onClick={() => setRole("driver")}
							className={`flex-1 py-2.5 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
								role === "driver"
									? "bg-white text-emerald-600 shadow-sm"
									: "text-slate-500 hover:text-slate-700"
							}`}
						>
							<Car className="w-4 h-4" /> Driver
						</button>
					</div>

					<div className="space-y-4">
						<div>
							<label className="text-xs font-bold text-slate-700 uppercase ml-1">
								Full Name
							</label>
							<div className="relative mt-1">
								<div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
									<User className="h-5 w-5 text-slate-400" />
								</div>
								<input
									type="text"
									required
									value={fullName}
									onChange={(e) => setFullName(e.target.value)}
									className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
									placeholder="John Doe"
								/>
							</div>
						</div>

						<div>
							<label className="text-xs font-bold text-slate-700 uppercase ml-1">
								Email Address
							</label>
							<div className="relative mt-1">
								<div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
									<Mail className="h-5 w-5 text-slate-400" />
								</div>
								<input
									type="email"
									required
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
									placeholder="student@unilorin.edu.ng"
								/>
							</div>
						</div>

						<div>
							<label className="text-xs font-bold text-slate-700 uppercase ml-1">
								Unique Username
							</label>
							<div className="relative mt-1">
								<div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
									<AtSign className="h-5 w-5 text-slate-400" />
								</div>
								<input
									type="text"
									required
									value={username}
									onChange={(e) =>
										setUsername(
											e.target.value.toLowerCase().replace(/\s+/g, "")
										)
									}
									className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
									placeholder="johndoe123"
								/>
							</div>
						</div>

						<div>
							<label className="text-xs font-bold text-slate-700 uppercase ml-1">
								Password
							</label>
							<div className="relative mt-1">
								<div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
									<Lock className="h-5 w-5 text-slate-400" />
								</div>
								<input
									type={isPasswordVisible ? "text" : "password"}
									required
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									className="block w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
									placeholder="••••••••"
								/>
								<PasswordVisibilityButton visible={isPasswordVisible} onClick={() => setIsPasswordVisible((visible) => !visible)} />
							</div>
						</div>
					</div>

					<button
						type="submit"
						disabled={isLoading}
						className={`w-full flex items-center justify-center space-x-2 py-3.5 rounded-xl text-sm font-bold text-white shadow-lg transition-all ${
							role === "driver"
								? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30"
								: "bg-blue-600 hover:bg-blue-700 shadow-blue-600/30"
						}`}
					>
						{isLoading ? (
							<Loader2 className="w-5 h-5 animate-spin" />
						) : (
							<>
								<span>
									Create {role === "driver" ? "Driver" : "Commuter"} Account
								</span>
								<ArrowRight className="w-4 h-4" />
							</>
						)}
					</button>

					<p className="text-center text-sm text-slate-500 mt-6">
						Already have an account?{" "}
						<Link to="/login" className="font-bold text-blue-600 hover:underline">
							Log in here
						</Link>
					</p>
				</form>
			</div>
		</div>
	);
}

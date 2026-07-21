import { useState, type FormEvent } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { api } from "../lib/axios";
import { Mail, Lock, Loader2, ArrowRight } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";


const getApiErrorMessage = (error: unknown, fallback: string) => {
	const detail = (error as { response?: { data?: { detail?: string } } }).response?.data?.detail;
	return detail || fallback;
};

export default function Login() {
	const { setToken, setUser } = useAuthStore();
	const navigate = useNavigate();
	const [isLoading, setIsLoading] = useState(false);

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");

	const handleLogin = async (e: FormEvent) => {
		e.preventDefault();
		setIsLoading(true);

		try {
			const response = await api.post("/auth/login", {
				email: email,
				password: password,
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
			alert(`Login Failed: ${getApiErrorMessage(error, "Incorrect email or password")}`);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
			<div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
				<div className="bg-slate-900 p-8 text-center text-white">
					<h1 className="text-3xl font-heading font-black tracking-tight">
						SmartCommute
					</h1>
					<p className="text-slate-400 text-sm mt-2 font-medium">
						Welcome back to the terminal
					</p>
				</div>

				<form onSubmit={handleLogin} className="p-8 space-y-5">
					<div className="space-y-4">
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
									className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-500 outline-none transition-all"
									placeholder="student@unilorin.edu.ng"
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
									type="password"
									required
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-500 outline-none transition-all"
									placeholder="••••••••"
								/>
							</div>
						</div>
					</div>

					<button
						type="submit"
						disabled={isLoading}
						className="w-full flex items-center justify-center space-x-2 py-3.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/30 transition-all"
					>
						{isLoading ? (
							<Loader2 className="w-5 h-5 animate-spin" />
						) : (
							<>
								<span>Access Terminal</span>
								<ArrowRight className="w-4 h-4" />
							</>
						)}
					</button>

					<p className="text-center text-sm text-slate-500 mt-6">
						Don't have an account?{" "}
						<Link to="/register" className="font-bold text-blue-600 hover:underline">
							Create one here
						</Link>
					</p>
				</form>
			</div>
		</div>
	);
}

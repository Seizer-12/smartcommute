import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../lib/axios";
import { useAuthStore } from "../store/useAuthStore";
import { useGeofencedQueue } from "../hooks/useGeofencedQueue";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { Wallet, QrCode, X, Users, MapPin, Activity, BellRing, Bus } from "lucide-react";
import QRCode from "react-qr-code";

export default function DriverDashboard() {
	const hasNotified = useRef(false);
	const { user, setUser } = useAuthStore();
	const { isInPark, locationError } = useGeofencedQueue();
	const queryClient = useQueryClient();

	// Poll the park status every 30 seconds
	const { data: queueStatus, isLoading } = useQuery({
		queryKey: ["driverParkStatus"],
		queryFn: async () => {
			const response = await api.get("/queue/status");
			return response.data;
		},
		refetchInterval: 30000,
	});

	// Request browser notification permissions when the dashboard loads
	useEffect(() => {
		if (
			"Notification" in window &&
			Notification.permission !== "granted" &&
			Notification.permission !== "denied"
		) {
			Notification.requestPermission();
		}
	}, []);

	// Trigger the ping if congestion hits "High"
	useEffect(() => {
		if (queueStatus?.congestion_level === "High") {
			// Only ping them once per high-congestion wave so their phone doesn't spam every 30s
			if (!hasNotified.current && "Notification" in window && Notification.permission === "granted") {
				new Notification("High Demand at UNILORIN Terminus!", {
					body: `There are currently ${queueStatus.active_commuters} students waiting. Head to the park now!`,
					icon: "/favicon.ico", // Optional: path to your app logo
				});
				hasNotified.current = true;
			}
		} else if (queueStatus && queueStatus.congestion_level !== "High") {
			// If congestion drops back down, reset the trigger so they can be notified again later
			hasNotified.current = false;
		}
	}, [queueStatus]);

	const [showReceiveModal, setShowReceiveModal] = useState(false);
	const [dispatchMessage, setDispatchMessage] = useState("");
	const setAvailability = useMutation({
		mutationFn: async (available: boolean) =>
			(await api.post<{ available: boolean }>("/queue/availability", { available })).data,
		onSuccess: (data) => {
			if (user) setUser({ ...user, is_available: data.available });
			queryClient.invalidateQueries({ queryKey: ["driverParkStatus"] });
		},
	});
	const dispatchQueue = useMutation({
		mutationFn: async () => (await api.post<{ message: string; boarded_commuters: number }>("/queue/dispatch")).data,
		onSuccess: (data) => {
			setDispatchMessage(data.message);
			queryClient.invalidateQueries({ queryKey: ["driverParkStatus"] });
		},
		onError: (error: { response?: { data?: { detail?: string } } }) => {
			setDispatchMessage(error.response?.data?.detail || "Could not dispatch commuters.");
		},
	});

	return (
		<div className="space-y-6 animate-in fade-in duration-500">
			{/* Receive Payment Modal */}
			{showReceiveModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
					<Card className="w-full max-w-sm p-8 relative border-slate-200 shadow-2xl animate-in fade-in zoom-in duration-200 bg-white flex flex-col items-center text-center">
						<button
							onClick={() => setShowReceiveModal(false)}
							className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 outline-none p-1 rounded-lg hover:bg-slate-50 transition-colors"
						>
							<X className="w-6 h-6" />
						</button>

						<div className="mb-6">
							<div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-emerald-100">
								<QrCode className="w-8 h-8" />
							</div>
							<h3 className="text-xl font-heading font-black text-slate-900">
								Receive Payment
							</h3>
							<p className="text-sm text-slate-500 mt-1">
								Commuters can scan this or type your username
							</p>
						</div>

						{/* Generates the QR Code using the Driver's Username */}
						<div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 inline-block">
							<QRCode
								value={user?.username ? `@${user.username}` : "unknown"}
								size={200}
								level="H"
								fgColor="#0f172a"
							/>
						</div>

						<div className="bg-slate-50 w-full py-4 rounded-xl border border-slate-200">
							<p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
								Your Driver Username
							</p>
							<p className="text-2xl font-heading font-black text-slate-900 tracking-tight">
								@{user?.username}
							</p>
						</div>
					</Card>
				</div>
			)}

			{/* Page Header */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
				<div>
					<h1 className="text-2xl sm:text-3xl font-heading font-black text-slate-900">
						Driver Portal
					</h1>
					<p className="text-sm text-slate-500 mt-1">Logged in as {user?.full_name}</p>
				</div>
				<div className="flex flex-wrap gap-3">
					<Button
						onClick={() => setAvailability.mutate(!user?.is_available)}
						disabled={setAvailability.isPending || (!isInPark && !user?.is_available)}
						className={`sm:w-auto px-6 ${user?.is_available ? "bg-slate-700 hover:bg-slate-800" : "bg-emerald-600 hover:bg-emerald-700"}`}
					>
						<MapPin className="w-4 h-4" />
						<span>{user?.is_available ? "Stop availability" : "Available at terminus"}</span>
					</Button>
					<Button
						onClick={() => setShowReceiveModal(true)}
						className="sm:w-auto px-6 bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20"
						>
							<QrCode className="w-4 h-4" />
							<span>Receive Payment</span>
						</Button>
						<Button
							onClick={() => dispatchQueue.mutate()}
							disabled={dispatchQueue.isPending || !user?.is_available || !isInPark}
							className="sm:w-auto px-6 bg-blue-600 hover:bg-blue-700"
						>
							<Bus className="w-4 h-4" />
							<span>{dispatchQueue.isPending ? "Dispatching..." : "Dispatch Next Riders"}</span>
						</Button>
					</div>
				</div>
				{locationError && <p className="-mt-4 text-sm font-semibold text-amber-700">{locationError}</p>}
				{!locationError && !isInPark && <p className="-mt-4 text-sm text-slate-500">Share your current location at the terminus to become available for dispatch.</p>}
				{dispatchMessage && <p className="-mt-4 text-sm font-semibold text-slate-600">{dispatchMessage}</p>}

			{/* Stats Grid */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="lg:col-span-2 space-y-6">
					<Card className="bg-gradient-to-br from-emerald-600 to-teal-500 border-none text-white shadow-lg shadow-emerald-500/20 p-6 sm:p-8">
						<div className="flex justify-between items-start">
							<div>
								<p className="text-emerald-100 text-sm font-bold tracking-wide uppercase mb-1">
									Total Earnings
								</p>
								<h2 className="text-4xl sm:text-5xl font-heading font-black tracking-tight flex items-center gap-3">
									₦{(user?.wallet_balance || 0).toFixed(2)}
								</h2>
							</div>
							<div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm">
								<Wallet className="w-6 h-6 text-white" />
							</div>
						</div>
						<div className="mt-8 flex space-x-3">
							<Link to="/dashboard/wallet" className="bg-white text-emerald-600 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm">
								Withdraw to Bank
							</Link>
						</div>
					</Card>

					{/* --- LIVE DEMAND WIDGET --- */}
					<div className="mb-8">
						<div className="bg-gray-100 p-6 rounded-2xl shadow-lg border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
							<div className="flex items-start gap-4">
								<div
									className={`p-3 rounded-xl ${
										queueStatus?.congestion_level === "High"
											? "bg-red-500/20 text-red-400 animate-pulse"
											: "bg-slate-800 text-slate-400"
									}`}
								>
									{queueStatus?.congestion_level === "High" ? (
										<BellRing className="w-6 h-6" />
									) : (
										<Activity className="w-6 h-6" />
									)}
								</div>
								<div>
									<h3 className="font-bold text-slate-800 text-lg">
										Live Park Demand
									</h3>
									<p className="text-sm text-slate-500 mt-0.5">
										{queueStatus?.congestion_level === "High"
											? `${queueStatus.buses_short ?? 0} more bus(es) needed at the terminus.`
											: "Normal commuter flow at the moment."}
									</p>
								</div>
							</div>

							<div className="flex flex-col items-start sm:items-end bg-slate-200/50 p-3 rounded-xl border border-slate-500/50">
								<span
									className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-1 ${
										queueStatus?.congestion_level === "High"
											? "bg-red-500 text-slate-800"
											: queueStatus?.congestion_level === "Moderate"
											? "bg-amber-500 text-slate-800"
											: "bg-emerald-500 text-slate-800"
									}`}
								>
									{isLoading ? "..." : queueStatus?.congestion_level} Traffic
								</span>
								<div className="flex items-center gap-2 text-white font-heading font-black text-2xl">
									{isLoading ? "--" : queueStatus?.active_commuters}
									<Users className="w-5 h-5 text-slate-800" />
								</div>
							</div>
						</div>
					</div>
					{/* --------------------------- */}

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<Card className="p-5 flex flex-col justify-center border-slate-200">
							<div className="flex justify-between items-start mb-4">
								<div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
									<MapPin className="w-5 h-5" />
								</div>
							</div>
							<p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
								Current Location
							</p>
							<p className="text-2xl font-heading font-black text-slate-900">
								{isInPark ? "At Terminus" : "Away from terminus"}
							</p>
						</Card>
						<Card className="p-5 flex flex-col justify-center border-slate-200">
							<div className="flex justify-between items-start mb-4">
								<div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
									<Users className="w-5 h-5" />
								</div>
							</div>
							<p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
								Available Buses
							</p>
							<p className="text-2xl font-heading font-black text-slate-900">{queueStatus?.available_buses ?? 0}</p>
						</Card>
					</div>
				</div>
			</div>
		</div>
	);
}

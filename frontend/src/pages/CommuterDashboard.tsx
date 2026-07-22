import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import {
	Activity,
	MapPin,
	Users,
	Wallet,
	Bus,
	QrCode,
	Navigation,
	Loader2,
	X,
	Camera,
	Keyboard,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePaystackPayment } from "react-paystack";
import { Html5Qrcode } from "html5-qrcode";
import { api } from "../lib/axios";
import { useGeofencedQueue } from "../hooks/useGeofencedQueue";
import { useAlertStore } from "../store/useAlertStore";


type ApiError = { response?: { data?: { detail?: string } } };
type PaystackReference = { reference: string };

const getApiErrorMessage = (error: unknown, fallback: string) => {
	const detail = (error as ApiError).response?.data?.detail;
	return detail || fallback;
};

// --- CAMERA SCANNER COMPONENT ---
function CameraScanner({ onScanSuccess, onInvalidScan }: { onScanSuccess: (text: string) => void; onInvalidScan: () => void }) {
	const [cameraError, setCameraError] = useState<string | null>(null);
	const scanHandledRef = useRef(false);
	const lastInvalidScanRef = useRef(0);
	const onScanSuccessRef = useRef(onScanSuccess);
	const onInvalidScanRef = useRef(onInvalidScan);

	useEffect(() => {
		onScanSuccessRef.current = onScanSuccess;
	}, [onScanSuccess]);

	useEffect(() => {
		onInvalidScanRef.current = onInvalidScan;
	}, [onInvalidScan]);

	useEffect(() => {
		const scannerId = "physical-camera-stream";
		const html5QrcodeScanner = new Html5Qrcode(scannerId);

		const stopScanner = async () => {
			try {
				if (html5QrcodeScanner.isScanning) {
					await html5QrcodeScanner.stop();
				}
			} catch (error) {
				console.error(error);
			}

			try {
				await html5QrcodeScanner.clear();
			} catch (error) {
				console.error(error);
			}
		};

		const startCamera = async () => {
			try {
				await html5QrcodeScanner.start(
					{ facingMode: "environment" },
					{
						fps: 10,
						qrbox: (width, height) => {
							const size = Math.min(width, height) * 0.65;
							return { width: size, height: size };
						},
					},
					(decodedText) => {
						if (scanHandledRef.current) return;

						// Driver payment QR codes must use the @username format.
						const isValidDriverTag =
							decodedText.startsWith("@") && !decodedText.includes(" ");

						if (!isValidDriverTag) {
							const now = Date.now();
							if (now - lastInvalidScanRef.current > 2000) {
								lastInvalidScanRef.current = now;
								onInvalidScanRef.current();
							}
							return;
						}

						scanHandledRef.current = true;
						void stopScanner().finally(() => {
							onScanSuccessRef.current(decodedText);
						});
					},
					() => {} // Ignore scan failures (empty frames)
				);
			} catch {
				setCameraError(
					"Could not access your rear camera. Please ensure permissions are granted."
				);
			}
		};
		startCamera();

		// Cleanup camera when component unmounts
		return () => {
			scanHandledRef.current = true;
			void stopScanner();
		};
	}, []);

	return (
		<div className="space-y-4 mt-4">
			{cameraError ? (
				<div className="p-4 bg-red-50 text-red-600 rounded-xl text-xs font-semibold text-center">
					{cameraError}
				</div>
			) : (
				<div className="relative overflow-hidden rounded-2xl bg-slate-900 aspect-square border border-slate-800">
					<div id="physical-camera-stream" className="w-full h-full object-cover" />
					<div className="absolute inset-0 border-[32px] border-slate-950/40 pointer-events-none flex items-center justify-center">
						<div className="w-full h-full border-2 border-dashed border-blue-500/80 animate-pulse rounded-lg" />
					</div>
				</div>
			)}
		</div>
	);
}

// --- MAIN DASHBOARD ---
export default function CommuterDashboard() {
	// --- NEW GEOFENCE LOGIC ---
	const { isInPark } = useGeofencedQueue();

	const { data: queueStatus, isLoading } = useQuery({
		queryKey: ["queueStatus"],
		queryFn: async () => {
			const response = await api.get("/queue/status");
			return response.data;
		},
		refetchInterval: 5000,
	});

	const getCongestionColor = (level: string) => {
		if (level === "High") return "text-red-600 bg-red-50 border-red-200";
		if (level === "Moderate") return "text-amber-600 bg-amber-50 border-amber-200";
		return "text-emerald-600 bg-emerald-50 border-emerald-200";
	};
	// --------------------------

	const { user } = useAuthStore();
	const showAlert = useAlertStore((state) => state.showAlert);
	const queryClient = useQueryClient();
	const [isVerifying, setIsVerifying] = useState(false);

	// Payment UI State
	const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
	const [paymentMode, setPaymentMode] = useState<"scan" | "manual">("scan");
	const [driverUsernameInput, setDriverUsernameInput] = useState("");
	const [isPaying, setIsPaying] = useState(false);
	const isPayingRef = useRef(false);
	const fareAmountLabel = "₦150/₦250";

	const parkStatus = queueStatus;
	const isStatusLoading = isLoading;
	const isJoined = Boolean(queueStatus?.is_joined);

	const joinQueue = useMutation({
		mutationFn: () => api.post("/queue/join"),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["queueStatus"] });
			showAlert("You have joined the queue.", "success");
		},
		onError: (error: unknown) => {
			showAlert(getApiErrorMessage(error, "Could not join the queue."), "error");
		},
	});

	const leaveQueue = useMutation({
		mutationFn: () => api.post("/queue/leave"),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["queueStatus"] });
			showAlert("You have left the queue.", "info");
		},
		onError: (error: unknown) => {
			showAlert(getApiErrorMessage(error, "Could not leave the queue."), "error");
		},
	});

	// Paystack
	const fundAmountNaira = 1000;
	const initializePayment = usePaystackPayment({
		reference: `SC_${new Date().getTime()}`,
		email: user?.email || "student@unilorin.edu.ng",
		amount: fundAmountNaira * 100,
		publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "",
		currency: "NGN",
	});

	const onSuccess = async (reference: PaystackReference) => {
		setIsVerifying(true);
		try {
			const response = await api.post(
				`/wallet/verify/${reference.reference}`,
				{},
				{ timeout: 20000 }
			);
			if (user)
				useAuthStore.setState({
					user: { ...user, wallet_balance: response.data.new_balance },
				});
			showAlert(`₦${fundAmountNaira} added to your wallet.`, "success");
		} catch (error: unknown) {
			showAlert(`Verification failed: ${getApiErrorMessage(error, "Error")}`, "error");
		} finally {
			setIsVerifying(false);
		}
	};

	// Process the final payment to the driver
	const processFarePayment = async (targetUsername: string) => {
		if (!targetUsername) return showAlert("Please provide a valid driver username.", "warning");
		if (isPayingRef.current) return;
		const cleanUsername = targetUsername.replace("@", "").trim();

		setIsPaymentModalOpen(false);
		isPayingRef.current = true;
		setIsPaying(true);

		try {
			const response = await api.post("/wallet/pay-driver", {
				driver_username: cleanUsername,
			});

			if (user) {
				useAuthStore.setState({
					user: { ...user, wallet_balance: response.data.new_balance },
				});
			}

			showAlert(response.data.message, "success");
			setDriverUsernameInput(""); // Clears the manual input field
		} catch (error: unknown) {
			showAlert(`Payment failed: ${getApiErrorMessage(error, "Could not process transaction")}`, "error");
		} finally {
			setIsPaying(false);
			isPayingRef.current = false;
		}
	};

	return (
		<div className="space-y-6 animate-in fade-in duration-500">
			{/* Universal Payment Modal */}
			{isPaymentModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
					<Card className="w-full max-w-sm p-6 relative border-slate-200 shadow-xl animate-in fade-in zoom-in duration-200 bg-white">
						<button
							onClick={() => setIsPaymentModalOpen(false)}
							className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 outline-none p-1 rounded-lg hover:bg-slate-50 transition-colors"
						>
							<X className="w-5 h-5" />
						</button>

						<div className="text-center mb-5 mt-2">
							<h3 className="text-xl font-heading font-black text-slate-900 flex items-center justify-center gap-2">
								Transfer Fare ({fareAmountLabel})
							</h3>
						</div>

						<div className="flex bg-slate-100 p-1 rounded-xl mb-4">
							<button
								onClick={() => setPaymentMode("scan")}
								className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
									paymentMode === "scan"
										? "bg-white text-blue-600 shadow-sm"
										: "text-slate-500 hover:text-slate-700"
								}`}
							>
								<Camera className="w-4 h-4" /> Scan QR
							</button>
							<button
								onClick={() => setPaymentMode("manual")}
								className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
									paymentMode === "manual"
										? "bg-white text-blue-600 shadow-sm"
										: "text-slate-500 hover:text-slate-700"
								}`}
							>
								<Keyboard className="w-4 h-4" /> Type Username
							</button>
						</div>

						{paymentMode === "scan" ? (
							<CameraScanner
								onScanSuccess={(text) => processFarePayment(text)}
								onInvalidScan={() => showAlert("Invalid QR code. Scan a valid SmartCommute driver code.", "warning")}
							/>
						) : (
							<div className="space-y-4 mt-6">
								<div>
									<label className="text-xs font-bold text-slate-700 uppercase">
										Driver Username
									</label>
									<div className="relative mt-1">
										<span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
											@
										</span>
										<input
											type="text"
											value={driverUsernameInput}
											onChange={(e) => setDriverUsernameInput(e.target.value)}
											placeholder="driver_name"
											className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-slate-900"
										/>
									</div>
								</div>
							<Button
								onClick={() => processFarePayment(driverUsernameInput)}
								disabled={isPaying}
								className="w-full py-3"
							>
								Pay Fare Now
							</Button>
							</div>
						)}
					</Card>
				</div>
			)}

			{/* Global Processing Loader */}
			{isPaying && (
				<div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/40 backdrop-blur-md">
					<div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 flex flex-col items-center space-y-4">
						<Loader2 className="w-10 h-10 animate-spin text-blue-600" />
						<p className="text-sm font-bold text-slate-800">
							Processing Fare Remittance...
						</p>
					</div>
				</div>
			)}

			{/* Page Header */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
				<div>
					<h1 className="text-2xl sm:text-3xl font-heading font-black text-slate-900">
						Welcome, @{user?.username}
					</h1>
					<p className="text-sm text-slate-500 mt-1">
						UNILORIN ITS Commuter Terminal is active.
					</p>
				</div>
				<Button
					onClick={() => setIsPaymentModalOpen(true)}
					className="sm:w-auto px-6 shadow-md shadow-blue-600/20"
				>
					<QrCode className="w-4 h-4" />
					<span>Pay Driver</span>
				</Button>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="lg:col-span-2 space-y-6">
					<Card className="bg-gradient-to-br from-blue-600 to-sky-500 border-none text-white shadow-lg shadow-blue-500/20 p-6 sm:p-8">
						<div className="flex justify-between items-start">
							<div>
								<p className="text-blue-100 text-sm font-bold tracking-wide uppercase mb-1">
									Available Balance
								</p>
								<h2 className="text-4xl sm:text-5xl font-heading font-black tracking-tight flex items-center gap-3">
									₦{(user?.wallet_balance || 0).toFixed(2)}
									{isVerifying && (
										<Loader2 className="w-6 h-6 animate-spin text-blue-200" />
									)}
								</h2>
							</div>
							<div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm">
								<Wallet className="w-6 h-6 text-white" />
							</div>
						</div>
						<div className="mt-8 flex space-x-3">
							<button
								onClick={() => initializePayment({ onSuccess, onClose: () => {} })}
								disabled={isVerifying}
								className="bg-white text-blue-600 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors disabled:opacity-70"
							>
								{isVerifying ? "Verifying..." : `Quick Fund ₦${fundAmountNaira}`}
							</button>
						</div>
					</Card>

					{/* --- LIVE CONGESTION WIDGET --- */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
						{/* Status Card */}
						<div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
							<div className="flex justify-between items-start mb-4">
								<div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
									<Activity className="w-6 h-6" />
								</div>
								<span
									className={`px-3 py-1 rounded-full text-xs font-bold border ${getCongestionColor(
										queueStatus?.congestion_level || "Low"
									)}`}
								>
									{queueStatus?.congestion_level || "Loading..."} Congestion
								</span>
							</div>
							<div>
								<p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">
									Students Waiting
								</p>
								<div className="flex items-end gap-2">
									<h2 className="text-5xl font-heading font-black text-slate-900">
										{isLoading ? "--" : queueStatus?.active_commuters || 0}
									</h2>
									<span className="text-slate-500 font-medium mb-1 flex items-center gap-1">
										<Users className="w-4 h-4" /> in park
									</span>
								</div>
							</div>
						</div>

						{/* User Location Card */}
						<div
							className={`p-6 rounded-2xl shadow-sm border flex flex-col justify-between gap-5 transition-colors duration-500 ${
								isInPark
									? "bg-emerald-50 border-emerald-200"
									: "bg-slate-50 border-slate-200"
							}`}
						>
							<div className="flex items-center gap-4">
								<div
									className={`p-3 rounded-full ${
										isInPark
											? "bg-emerald-100 text-emerald-600 animate-pulse"
											: "bg-slate-200 text-slate-400"
									}`}
								>
									<MapPin className="w-6 h-6" />
								</div>
								<div>
									<h3
										className={`font-bold ${
											isInPark ? "text-emerald-900" : "text-slate-700"
										}`}
									>
										{isInPark
											? "You are at the Terminal"
											: "You are away from the Terminal"}
									</h3>
									<p
										className={`text-sm ${
											isInPark ? "text-emerald-700" : "text-slate-500"
										}`}
									>
										{isJoined
											? `Queue position ${queueStatus?.position || "--"}`
											: isInPark
											? "You can join the passenger queue now."
											: "Move within the park geofence to join the queue."}
									</p>
								</div>
							</div>
							<Button
								onClick={() => (isJoined ? leaveQueue.mutate() : joinQueue.mutate())}
								disabled={(!isInPark && !isJoined) || joinQueue.isPending || leaveQueue.isPending}
								variant={isJoined ? "outline" : "primary"}
								className="w-full"
							>
								{isJoined ? "Leave Queue" : "Join Queue"}
							</Button>
						</div>
					</div>
					{/* ---------------------------------- */}

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<Card className="p-5 flex flex-col justify-center border-slate-200 relative overflow-hidden">
							{isStatusLoading && (
								<div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 animate-pulse" />
							)}
							<div className="flex justify-between items-start mb-4">
								<div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
									<Activity className="w-5 h-5" />
								</div>
							</div>
							<p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
								Est. Wait Time
							</p>
							<p className="text-2xl font-heading font-black text-slate-900">
								{parkStatus
									? `~${parkStatus.estimated_wait_time_minutes} Mins`
									: "-- Mins"}
							</p>
						</Card>
						<Card className="p-5 flex flex-col justify-center border-slate-200 relative overflow-hidden">
							{isStatusLoading && (
								<div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 animate-pulse" />
							)}
							<div className="flex justify-between items-start mb-4">
								<div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl">
									<Bus className="w-5 h-5" />
								</div>
							</div>
							<p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
								Active Queue
							</p>
							<p className="text-2xl font-heading font-black text-slate-900">
								{parkStatus
									? `${parkStatus.waiting_commuters} Students`
									: "-- Students"}
							</p>
						</Card>
					</div>
				</div>

				<div className="lg:col-span-1">
					<Card className="h-full p-6 border-slate-200 flex flex-col">
						<h3 className="text-lg font-bold text-slate-900 mb-6">Recent Journeys</h3>
						<div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500 space-y-3 py-10">
							<div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
								<Navigation className="w-6 h-6 text-slate-300" />
							</div>
							<div>
								<p className="text-sm font-bold text-slate-700">No rides yet</p>
								<p className="text-xs mt-1 max-w-[200px]">
									Scan a driver's QR code at the park to log your first journey.
								</p>
							</div>
						</div>
					</Card>
				</div>
			</div>
		</div>
	);
}

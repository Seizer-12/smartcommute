import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { useAlertStore } from "../store/useAlertStore";

export function AlertToast() {
	const { alert, dismissAlert } = useAlertStore();

	useEffect(() => {
		if (!alert) return;
		const timeout = window.setTimeout(() => dismissAlert(alert.id), 5000);
		return () => window.clearTimeout(timeout);
	}, [alert, dismissAlert]);

	return (
		<div className="pointer-events-none fixed right-4 top-4 z-50 w-[min(24rem,calc(100vw-2rem))]">
			<AnimatePresence mode="wait">
				{alert && <Toast key={alert.id} message={alert.message} type={alert.type} onDismiss={() => dismissAlert(alert.id)} />}
			</AnimatePresence>
		</div>
	);
}

function Toast({ message, type, onDismiss }: { message: string; type: "success" | "error" | "warning" | "info"; onDismiss: () => void }) {
	const styles = {
		success: "border-emerald-200 bg-emerald-50 text-emerald-800",
		error: "border-red-200 bg-red-50 text-red-800",
		warning: "border-amber-200 bg-amber-50 text-amber-800",
		info: "border-blue-200 bg-blue-50 text-blue-800",
	}[type];
	const Icon = type === "success" ? CheckCircle2 : type === "error" ? AlertCircle : type === "warning" ? TriangleAlert : Info;

	return (
		<motion.div
			role="alert"
			aria-live={type === "error" ? "assertive" : "polite"}
			aria-atomic="true"
			initial={{ opacity: 0, y: -12, scale: 0.98 }}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			exit={{ opacity: 0, y: -8, scale: 0.98 }}
			transition={{ duration: 0.2, ease: "easeOut" }}
			className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-lg ${styles}`}
		>
			<Icon className="mt-0.5 h-5 w-5 shrink-0" />
			<p className="flex-1 text-sm font-semibold leading-relaxed">{message}</p>
			<button type="button" onClick={onDismiss} aria-label="Dismiss notification" className="rounded p-0.5 transition-colors hover:bg-black/5"><X className="h-4 w-4" /></button>
		</motion.div>
	);
}

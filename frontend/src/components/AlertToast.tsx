import { useEffect } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { useAlertStore } from "../store/useAlertStore";

export function AlertToast() {
	const { alert, dismissAlert } = useAlertStore();

	useEffect(() => {
		if (!alert) return;
		const timeout = window.setTimeout(dismissAlert, 6000);
		return () => window.clearTimeout(timeout);
	}, [alert, dismissAlert]);

	if (!alert) return null;
	const styles = {
		success: "border-emerald-200 bg-emerald-50 text-emerald-800",
		error: "border-red-200 bg-red-50 text-red-800",
		info: "border-blue-200 bg-blue-50 text-blue-800",
	}[alert.type];
	const Icon = alert.type === "success" ? CheckCircle2 : alert.type === "error" ? AlertCircle : Info;

	return (
		<div className="fixed right-4 top-4 z-50 w-[min(24rem,calc(100vw-2rem))] animate-in fade-in slide-in-from-top-2 duration-200">
			<div role="alert" className={`flex items-start gap-3 rounded-xl border p-4 shadow-lg ${styles}`}>
				<Icon className="mt-0.5 h-5 w-5 shrink-0" />
				<p className="flex-1 text-sm font-semibold leading-relaxed">{alert.message}</p>
				<button type="button" onClick={dismissAlert} aria-label="Dismiss notification" className="rounded p-0.5 hover:bg-black/5"><X className="h-4 w-4" /></button>
			</div>
		</div>
	);
}

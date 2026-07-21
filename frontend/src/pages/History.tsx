import { useQuery } from "@tanstack/react-query";
import { Card } from "../components/Card";
import { Bus, ArrowDownLeft, Calendar, WalletCards, ArrowUpRight } from "lucide-react";
import { api } from "../lib/axios";
import { useAuthStore } from "../store/useAuthStore";

type Transaction = {
	id: number;
	type: "wallet_funding" | "fare_payment" | "fare_received" | "withdrawal";
	status: "pending" | "success" | "failed";
	amount: number;
	reference: string | null;
	description: string;
	counterparty_id: number | null;
	created_at: string;
};

const icons = {
	wallet_funding: ArrowDownLeft,
	fare_payment: Bus,
	fare_received: WalletCards,
	withdrawal: ArrowUpRight,
};

const amountPrefix = (type: Transaction["type"]) =>
	type === "fare_payment" || type === "withdrawal" ? "-" : "+";

export default function History() {
	const { user } = useAuthStore();
	const { data: transactions = [], isLoading, isError } = useQuery({
		queryKey: ["transactions", user?.id],
		queryFn: async () => {
			const response = await api.get<Transaction[]>("/wallet/transactions");
			return response.data;
		},
		enabled: Boolean(user?.id),
	});

	return (
		<div className="space-y-6 animate-in fade-in duration-500">
			<div className="mb-8">
				<h1 className="text-2xl sm:text-3xl font-heading font-black text-slate-900">Transaction History</h1>
				<p className="text-sm text-slate-500 mt-1">Review your recent rides and wallet activity.</p>
			</div>

			<Card className="p-0 overflow-hidden border-slate-200">
				{isLoading && <div className="p-6 text-sm font-semibold text-slate-500">Loading transactions...</div>}
				{isError && <div className="p-6 text-sm font-semibold text-red-600">Could not load transactions.</div>}
				{!isLoading && !isError && transactions.length === 0 && (
					<div className="p-8 text-center text-sm font-semibold text-slate-500">No transactions yet.</div>
				)}
				<div className="divide-y divide-slate-100">
					{transactions.map((tx) => {
						const Icon = icons[tx.type];
						const isCredit = amountPrefix(tx.type) === "+";
						return (
							<div key={tx.id} className="p-4 sm:p-6 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
								<div className="flex items-center gap-4 min-w-0">
									<div className={`p-3 rounded-2xl ${isCredit ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
										<Icon className="w-5 h-5" />
									</div>
									<div className="min-w-0">
										<p className="font-bold text-slate-900 truncate">{tx.description}</p>
										<div className="flex items-center gap-2 text-xs font-medium text-slate-500 mt-0.5">
											<span className="flex items-center gap-1">
												<Calendar className="w-3 h-3" /> {new Date(tx.created_at).toLocaleString()}
											</span>
										</div>
									</div>
								</div>
								<div className="text-right shrink-0">
									<p className={`font-bold ${isCredit ? "text-emerald-600" : "text-slate-900"}`}>
										{amountPrefix(tx.type)}₦{tx.amount.toFixed(2)}
									</p>
									<p className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${tx.status === "pending" ? "text-amber-500" : "text-emerald-500"}`}>{tx.status}</p>
								</div>
							</div>
						);
					})}
				</div>
			</Card>
		</div>
	);
}

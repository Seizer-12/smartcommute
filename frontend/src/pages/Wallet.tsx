import { useState } from "react";
import { usePaystackPayment } from "react-paystack";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../store/useAuthStore";
import { Card } from "../components/Card";
import { CreditCard, ArrowUpRight, ShieldCheck, Loader2 } from "lucide-react";
import { api } from "../lib/axios";

type PaystackReference = { reference: string };

const getApiErrorMessage = (error: unknown, fallback: string) => {
	const detail = (error as { response?: { data?: { detail?: string } } }).response?.data?.detail;
	return detail || fallback;
};

const MINIMUM_FUNDING_AMOUNT = 100;
const MINIMUM_WITHDRAWAL_AMOUNT = 1000;

export default function Wallet() {
	const { user, setUser } = useAuthStore();
	const queryClient = useQueryClient();
	const isDriver = user?.role === "driver";
	const [fundingAmount, setFundingAmount] = useState("1000");
	const [withdrawAmount, setWithdrawAmount] = useState("");
	const [bankName, setBankName] = useState("");
	const [accountNumber, setAccountNumber] = useState("");
	const [accountName, setAccountName] = useState("");
	const [message, setMessage] = useState("");
	const [isBusy, setIsBusy] = useState(false);
	const [paymentReference, setPaymentReference] = useState(() => `SC_${Date.now()}`);
	const amount = Number(fundingAmount);
	const isFundingAmountValid = Number.isFinite(amount) && amount >= MINIMUM_FUNDING_AMOUNT;

	const initializePayment = usePaystackPayment({
		reference: paymentReference,
		email: user?.email || "student@unilorin.edu.ng",
		amount: amount * 100,
		publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "",
		currency: "NGN",
	});

	const verifyPayment = async (reference: PaystackReference) => {
		setIsBusy(true);
		setMessage("");
		try {
			const response = await api.post(`/wallet/verify/${reference.reference}`);
			if (user) setUser({ ...user, wallet_balance: response.data.new_balance });
			queryClient.invalidateQueries({ queryKey: ["transactions"] });
			setMessage(`₦${amount} added to your wallet.`);
			setPaymentReference(`SC_${Date.now()}`);
		} catch (error: unknown) {
			setMessage(getApiErrorMessage(error, "Payment verification failed."));
		} finally {
			setIsBusy(false);
		}
	};

	const submitWithdrawal = async () => {
		const requestedAmount = Number(withdrawAmount);
		const cleanBankName = bankName.trim();
		const cleanAccountNumber = accountNumber.trim();
		const cleanAccountName = accountName.trim();

		if (!requestedAmount || requestedAmount < MINIMUM_WITHDRAWAL_AMOUNT) {
			setMessage("The minimum withdrawal amount is ₦1,000.");
			return;
		}
		if (!cleanBankName || !cleanAccountName || !/^\d{10}$/.test(cleanAccountNumber)) {
			setMessage("Enter a bank name, account name, and 10-digit account number.");
			return;
		}

		setIsBusy(true);
		setMessage("");
		try {
			const response = await api.post("/wallet/withdraw", {
				amount: requestedAmount,
				bank_name: cleanBankName,
				account_number: cleanAccountNumber,
				account_name: cleanAccountName,
			});
			if (user) {
				setUser({
					...user,
					wallet_balance: response.data.new_balance,
					withdrawal_balance: response.data.withdrawal_balance,
				});
			}
			queryClient.invalidateQueries({ queryKey: ["transactions"] });
			setWithdrawAmount("");
			setBankName("");
			setAccountNumber("");
			setAccountName("");
			setMessage(response.data.message);
		} catch (error: unknown) {
			setMessage(getApiErrorMessage(error, "Withdrawal request failed."));
		} finally {
			setIsBusy(false);
		}
	};

	return (
		<div className="space-y-6 animate-in fade-in duration-500">
			<div className="mb-8">
				<h1 className="text-2xl sm:text-3xl font-heading font-black text-slate-900">Wallet Management</h1>
				<p className="text-sm text-slate-500 mt-1">Manage your terminal funds securely.</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<Card className={`col-span-1 md:col-span-2 p-8 border-none text-white shadow-lg ${isDriver ? "bg-gradient-to-br from-emerald-600 to-teal-500 shadow-emerald-500/20" : "bg-gradient-to-br from-blue-600 to-sky-500 shadow-blue-500/20"}`}>
					<p className="text-white/80 text-sm font-bold tracking-wide uppercase mb-1">Total Available Balance</p>
					<h2 className="text-5xl font-heading font-black tracking-tight mb-8">₦{(user?.wallet_balance || 0).toFixed(2)}</h2>
					{message && <p className="mb-4 text-sm font-bold text-white/90">{message}</p>}

					{!isDriver && (
						<div className="space-y-3">
							<div className="flex flex-col sm:flex-row gap-3">
								<div className="flex-1">
									<label htmlFor="funding-amount" className="mb-1 block text-xs font-bold uppercase tracking-wide text-white/80">Amount to fund</label>
									<div className="flex overflow-hidden rounded-xl border border-white/40 bg-white shadow-sm focus-within:ring-2 focus-within:ring-white/70">
										<span className="flex items-center px-4 font-bold text-slate-500">₦</span>
										<input id="funding-amount" type="number" inputMode="numeric" min={MINIMUM_FUNDING_AMOUNT} step="100" value={fundingAmount} onChange={(e) => setFundingAmount(e.target.value)} aria-describedby="funding-amount-help" className="min-w-0 flex-1 py-3 pr-4 text-slate-900 font-bold outline-none" />
									</div>
								</div>
								<button disabled={isBusy || !isFundingAmountValid || !import.meta.env.VITE_PAYSTACK_PUBLIC_KEY} onClick={() => initializePayment({ onSuccess: verifyPayment, onClose: () => {} })} className="self-end bg-white text-blue-600 px-6 py-3 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-60">
								{isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />} Fund via Paystack
								</button>
							</div>
							<div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-white/85">
								<span id="funding-amount-help">Minimum ₦100</span>
								{[500, 1000, 2000, 5000].map((preset) => <button key={preset} type="button" onClick={() => setFundingAmount(String(preset))} className="rounded-full border border-white/40 px-3 py-1 hover:bg-white/15 transition-colors">₦{preset.toLocaleString()}</button>)}
							</div>
						</div>
					)}

					{isDriver && (
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<input aria-label="Withdrawal amount" placeholder="Amount (minimum ₦1,000)" type="number" min={MINIMUM_WITHDRAWAL_AMOUNT} step="100" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} className="px-4 py-3 rounded-xl text-slate-900 font-bold bg-white border border-white/40 outline-none" />
							<input placeholder="Bank name" value={bankName} onChange={(e) => setBankName(e.target.value)} className="px-4 py-3 rounded-xl text-slate-900 font-bold bg-white border border-white/40 outline-none" />
							<input placeholder="Account number" inputMode="numeric" maxLength={10} value={accountNumber} onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))} className="px-4 py-3 rounded-xl text-slate-900 font-bold bg-white border border-white/40 outline-none" />
							<input placeholder="Account name" value={accountName} onChange={(e) => setAccountName(e.target.value)} className="px-4 py-3 rounded-xl text-slate-900 font-bold bg-white border border-white/40 outline-none" />
							<button disabled={isBusy} onClick={submitWithdrawal} className="sm:col-span-2 bg-white text-emerald-600 px-6 py-3 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-60">
								{isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />} Request Withdrawal
							</button>
						</div>
					)}
				</Card>

				<Card className="col-span-1 p-6 border-slate-200 flex flex-col justify-center items-center text-center">
					<div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100 mb-4">
						<ShieldCheck className="w-8 h-8 text-slate-400" />
					</div>
					<h3 className="font-bold text-slate-900 mb-1">Secured by Paystack</h3>
					<p className="text-xs text-slate-500">All card transactions are processed by Paystack. Driver withdrawals are recorded as pending payout requests for admin review.</p>
				</Card>
			</div>
		</div>
	);
}

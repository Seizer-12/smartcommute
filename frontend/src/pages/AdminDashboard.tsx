import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Banknote, Bus, CheckCircle2, Clock, Edit3, Search, Save, Users, X, XCircle } from "lucide-react";
import { api } from "../lib/axios";
import { Card } from "../components/Card";

interface AdminSummary {
	total_users: number;
	commuters: number;
	drivers: number;
	admins: number;
	pending_withdrawals: number;
	pending_payout_total: number;
}

interface AdminUser {
	id: number;
	username: string;
	full_name: string;
	email: string;
	role: "commuter" | "driver" | "admin";
	is_active: boolean;
	wallet_balance: number;
	withdrawal_balance: number;
	qr_code_uid: string | null;
	bus_type?: string | null;
	created_at: string;
}

interface Withdrawal {
	id: number;
	user_id: number;
	type: "withdrawal";
	status: "pending" | "success" | "failed";
	amount: number;
	reference: string | null;
	description: string;
	bank_name: string | null;
	account_number: string | null;
	account_name: string | null;
	created_at: string;
}

const money = (amount: number) => `₦${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const statusClass = (status: Withdrawal["status"]) => {
	if (status === "pending") return "bg-amber-50 text-amber-700 border-amber-200";
	if (status === "success") return "bg-emerald-50 text-emerald-700 border-emerald-200";
	return "bg-red-50 text-red-700 border-red-200";
};

export default function AdminDashboard() {
	const queryClient = useQueryClient();
	const [editingUserId, setEditingUserId] = useState<number | null>(null);
	const [walletBalance, setWalletBalance] = useState("");
	const [withdrawalBalance, setWithdrawalBalance] = useState("");
	const [balanceMessage, setBalanceMessage] = useState("");
	const [userSearch, setUserSearch] = useState("");
	const [busTypeMessage, setBusTypeMessage] = useState("");

	const { data: summary, isLoading: summaryLoading } = useQuery({
		queryKey: ["admin", "summary"],
		queryFn: async () => (await api.get<AdminSummary>("/admin/summary")).data,
	});
	const { data: users = [], isLoading: usersLoading } = useQuery({
		queryKey: ["admin", "users"],
		queryFn: async () => (await api.get<AdminUser[]>("/admin/users")).data,
	});
	const { data: withdrawals = [], isLoading: withdrawalsLoading } = useQuery({
		queryKey: ["admin", "withdrawals"],
		queryFn: async () => (await api.get<Withdrawal[]>("/admin/withdrawals")).data,
	});

	const usersById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);
	const drivers = users.filter((user) => user.role === "driver");
	const editableUsers = users.filter((user) => user.role === "commuter" || user.role === "driver");
	const searchTerm = userSearch.trim().toLowerCase();
	const searchedUsers = searchTerm
		? editableUsers.filter((user) =>
			[user.full_name, user.username, user.email, user.role, user.qr_code_uid ?? ""]
				.join(" ")
				.toLowerCase()
				.includes(searchTerm)
		)
		: [];
	const pendingWithdrawals = withdrawals.filter((withdrawal) => withdrawal.status === "pending");

	const reviewWithdrawal = useMutation({
		mutationFn: async ({ id, status }: { id: number; status: "success" | "failed" }) => {
			return (await api.patch<Withdrawal>(`/admin/withdrawals/${id}`, { status })).data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin"] });
		},
	});

	const updateBalance = useMutation({
		mutationFn: async (user: AdminUser) => {
			const payload: { wallet_balance: number; withdrawal_balance?: number } = {
				wallet_balance: Number(walletBalance),
			};
			if (user.role === "driver") payload.withdrawal_balance = Number(withdrawalBalance);
			return (await api.patch<AdminUser>(`/admin/users/${user.id}/balance`, payload)).data;
		},
		onSuccess: () => {
			setEditingUserId(null);
			setBalanceMessage("Balance updated.");
			queryClient.invalidateQueries({ queryKey: ["admin"] });
		},
		onError: () => setBalanceMessage("Could not update balance."),
	});
	const updateBusType = useMutation({
		mutationFn: async ({ id, busType }: { id: number; busType: "shuttle" | "macopolo" }) => (await api.patch<AdminUser>(`/admin/users/${id}/bus-type`, { bus_type: busType })).data,
		onSuccess: () => { setBusTypeMessage("Driver vehicle type updated."); queryClient.invalidateQueries({ queryKey: ["admin"] }); },
		onError: () => setBusTypeMessage("Could not update driver vehicle type."),
	});

	const startBalanceEdit = (user: AdminUser) => {
		setEditingUserId(user.id);
		setWalletBalance(String(user.wallet_balance ?? 0));
		setWithdrawalBalance(String(user.withdrawal_balance ?? 0));
		setBalanceMessage("");
	};

	const saveBalance = (user: AdminUser) => {
		const wallet = Number(walletBalance);
		const held = Number(withdrawalBalance);
		if (!Number.isFinite(wallet) || wallet < 0 || (user.role === "driver" && (!Number.isFinite(held) || held < 0))) {
			setBalanceMessage("Enter valid non-negative balances.");
			return;
		}
		updateBalance.mutate(user);
	};

	const BalanceEditor = ({ user, compact = false }: { user: AdminUser; compact?: boolean }) => {
		const isEditing = editingUserId === user.id;
		if (!isEditing) {
			return (
				<div className={compact ? "text-right shrink-0" : "flex items-center justify-between gap-3"}>
					<div className={compact ? "mb-2" : ""}>
						<p className="font-black text-slate-900">{money(user.wallet_balance)}</p>
						{user.role === "driver" && <p className="text-xs text-slate-500">held {money(user.withdrawal_balance)}</p>}
					</div>
					<button onClick={() => startBalanceEdit(user)} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs font-bold">
						<Edit3 className="w-3.5 h-3.5" /> Edit
					</button>
				</div>
			);
		}

		return (
			<div className="min-w-[220px] space-y-2">
				<input type="number" min="0" step="0.01" value={walletBalance} onChange={(e) => setWalletBalance(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500" placeholder="Wallet balance" />
				{user.role === "driver" && <input type="number" min="0" step="0.01" value={withdrawalBalance} onChange={(e) => setWithdrawalBalance(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500" placeholder="Held withdrawal balance" />}
				<div className="flex justify-end gap-2">
					<button onClick={() => saveBalance(user)} disabled={updateBalance.isPending} className="p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50" title="Save balance"><Save className="w-4 h-4" /></button>
					<button onClick={() => setEditingUserId(null)} className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200" title="Cancel"><X className="w-4 h-4" /></button>
				</div>
			</div>
		);
	};

	return (
		<div className="space-y-6 animate-in fade-in duration-500">
			<div>
				<h1 className="text-2xl sm:text-3xl font-heading font-black text-slate-900">Admin Dashboard</h1>
				<p className="text-sm text-slate-500 mt-1">Monitor users, driver profiles, balances, and payout requests.</p>
				{(balanceMessage || busTypeMessage) && <p className="text-sm font-semibold text-slate-600 mt-2">{balanceMessage || busTypeMessage}</p>}
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
				<Card className="p-5 rounded-2xl shadow-sm"><div className="flex items-center justify-between mb-3"><p className="text-xs font-bold uppercase text-slate-500">Users</p><Users className="w-5 h-5 text-blue-600" /></div><p className="text-3xl font-black text-slate-900">{summaryLoading ? "..." : summary?.total_users ?? 0}</p><p className="text-xs text-slate-500 mt-1">{summary?.commuters ?? 0} commuters, {summary?.drivers ?? 0} drivers</p></Card>
				<Card className="p-5 rounded-2xl shadow-sm"><div className="flex items-center justify-between mb-3"><p className="text-xs font-bold uppercase text-slate-500">Drivers</p><Bus className="w-5 h-5 text-emerald-600" /></div><p className="text-3xl font-black text-slate-900">{drivers.length}</p><p className="text-xs text-slate-500 mt-1">Registered driver profiles</p></Card>
				<Card className="p-5 rounded-2xl shadow-sm"><div className="flex items-center justify-between mb-3"><p className="text-xs font-bold uppercase text-slate-500">Pending Payouts</p><Clock className="w-5 h-5 text-amber-600" /></div><p className="text-3xl font-black text-slate-900">{summary?.pending_withdrawals ?? 0}</p><p className="text-xs text-slate-500 mt-1">Awaiting review</p></Card>
				<Card className="p-5 rounded-2xl shadow-sm"><div className="flex items-center justify-between mb-3"><p className="text-xs font-bold uppercase text-slate-500">Payout Total</p><Banknote className="w-5 h-5 text-indigo-600" /></div><p className="text-3xl font-black text-slate-900">{money(summary?.pending_payout_total ?? 0)}</p><p className="text-xs text-slate-500 mt-1">Pending driver withdrawals</p></Card>
			</div>

			<Card className="p-0 overflow-hidden rounded-2xl shadow-sm">
				<div className="p-5 border-b border-slate-100 flex items-center justify-between"><div><h2 className="font-black text-slate-900">Withdrawal Requests</h2><p className="text-xs text-slate-500 mt-1">Approve paid payouts or return failed ones to driver wallets.</p></div><span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-700">{pendingWithdrawals.length} pending</span></div>
				<div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="text-left p-4">Driver</th><th className="text-left p-4">Bank</th><th className="text-left p-4">Amount</th><th className="text-left p-4">Status</th><th className="text-right p-4">Action</th></tr></thead><tbody className="divide-y divide-slate-100">
					{withdrawalsLoading && <tr><td className="p-4 text-slate-500" colSpan={5}>Loading withdrawals...</td></tr>}
					{!withdrawalsLoading && withdrawals.length === 0 && <tr><td className="p-4 text-slate-500" colSpan={5}>No withdrawal requests yet.</td></tr>}
					{withdrawals.map((withdrawal) => { const driver = usersById.get(withdrawal.user_id); return <tr key={withdrawal.id} className="hover:bg-slate-50/70"><td className="p-4"><p className="font-bold text-slate-900">{driver?.full_name ?? `User #${withdrawal.user_id}`}</p><p className="text-xs text-slate-500">@{driver?.username ?? withdrawal.user_id}</p></td><td className="p-4"><p className="font-semibold text-slate-700">{withdrawal.bank_name ?? "Bank not set"}</p><p className="text-xs text-slate-500">{withdrawal.account_name} • {withdrawal.account_number}</p></td><td className="p-4 font-black text-slate-900">{money(withdrawal.amount)}</td><td className="p-4"><span className={`inline-flex border px-2.5 py-1 rounded-full text-xs font-bold ${statusClass(withdrawal.status)}`}>{withdrawal.status}</span></td><td className="p-4 text-right">{withdrawal.status === "pending" ? <div className="flex justify-end gap-2"><button onClick={() => reviewWithdrawal.mutate({ id: withdrawal.id, status: "success" })} disabled={reviewWithdrawal.isPending} className="p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50" title="Mark paid"><CheckCircle2 className="w-4 h-4" /></button><button onClick={() => reviewWithdrawal.mutate({ id: withdrawal.id, status: "failed" })} disabled={reviewWithdrawal.isPending} className="p-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50" title="Decline and refund"><XCircle className="w-4 h-4" /></button></div> : <span className="text-xs text-slate-400 font-semibold">Reviewed</span>}</td></tr>; })}
				</tbody></table></div>
			</Card>

			<div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
				<Card className="p-0 overflow-hidden rounded-2xl shadow-sm">
					<div className="p-5 border-b border-slate-100"><h2 className="font-black text-slate-900">Driver Profiles</h2></div>
					<div className="divide-y divide-slate-100">
						{usersLoading && <div className="p-4 text-sm text-slate-500">Loading drivers...</div>}
						{drivers.map((driver) => <div key={driver.id} className="p-4 flex items-center justify-between gap-4"><div className="min-w-0"><p className="font-bold text-slate-900 truncate">{driver.full_name}</p><p className="text-xs text-slate-500 truncate">@{driver.username} • {driver.qr_code_uid ?? "No QR"}</p><select aria-label={`Vehicle type for ${driver.full_name}`} value={driver.bus_type ?? "shuttle"} onChange={(e) => updateBusType.mutate({ id: driver.id, busType: e.target.value as "shuttle" | "macopolo" })} disabled={updateBusType.isPending} className="mt-2 rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-700 disabled:opacity-50"><option value="shuttle">Korape Shuttle</option><option value="macopolo">Macopolo Bus</option></select></div><BalanceEditor user={driver} compact /></div>)}
						{!usersLoading && drivers.length === 0 && <div className="p-4 text-sm text-slate-500">No drivers registered.</div>}
					</div>
				</Card>

				<Card className="p-0 overflow-hidden rounded-2xl shadow-sm">
					<div className="p-5 border-b border-slate-100 space-y-4">
						<div>
							<h2 className="font-black text-slate-900">Find User Balance</h2>
							<p className="text-xs text-slate-500 mt-1">Search commuters and drivers by name, username, email, role, or QR id.</p>
						</div>
						<div className="relative">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
							<input
								type="search"
								value={userSearch}
								onChange={(e) => setUserSearch(e.target.value)}
								className="w-full pl-10 pr-3 py-3 rounded-xl border border-slate-200 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
								placeholder="Search by name, username, email, role, or QR id"
							/>
						</div>
					</div>
					<div className="divide-y divide-slate-100">
						{usersLoading && <div className="p-4 text-sm text-slate-500">Loading users...</div>}
						{!usersLoading && !searchTerm && <div className="p-4 text-sm text-slate-500">Enter a search term to locate a commuter or driver.</div>}
						{searchedUsers.map((user) => <div key={user.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div className="min-w-0"><p className="font-bold text-slate-900 truncate">{user.full_name}</p><p className="text-xs text-slate-500 truncate">@{user.username} • {user.email} • {user.role}</p></div><BalanceEditor user={user} /></div>)}
						{!usersLoading && searchTerm && searchedUsers.length === 0 && <div className="p-4 text-sm text-slate-500 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> No commuter or driver matched your search.</div>}
					</div>
				</Card>
			</div>
		</div>
	);
}

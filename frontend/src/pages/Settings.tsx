import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useAlertStore } from "../store/useAlertStore";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { PasswordVisibilityButton } from "../components/PasswordVisibilityButton";
import { User, Mail, AtSign, LockKeyhole } from "lucide-react";
import { api } from "../lib/axios";

const getApiErrorMessage = (error: unknown, fallback: string) => {
	const detail = (error as { response?: { data?: { detail?: string } } }).response?.data?.detail;
	return detail || fallback;
};

export default function Settings() {
	const { user, setUser } = useAuthStore();
	const showAlert = useAlertStore((state) => state.showAlert);
	const [fullName, setFullName] = useState(user?.full_name || "");
	const busType = user?.bus_type || "";
	const [isSaving, setIsSaving] = useState(false);
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [isChangingPassword, setIsChangingPassword] = useState(false);
	const [isSendingVerification, setIsSendingVerification] = useState(false);
	const [visiblePasswordField, setVisiblePasswordField] = useState<string | null>(null);

	const saveProfile = async () => {
		setIsSaving(true);
		try {
			const response = await api.patch("/account/me", {
				full_name: fullName,
			});
			setUser(response.data);
			showAlert("Profile updated.", "success");
		} catch (error: unknown) {
			const alert = getApiErrorMessage(error, "Could not update profile.");
			showAlert(alert, "error");
		} finally {
			setIsSaving(false);
		}
	};

	const changePassword = async () => {
		if (newPassword !== confirmPassword) {
			showAlert("New passwords do not match.", "error");
			return;
		}
		setIsChangingPassword(true);
		try {
			const response = await api.post("/auth/password/change", { current_password: currentPassword, new_password: newPassword });
			setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); showAlert(response.data.message, "success");
		} catch (error: unknown) { const alert = getApiErrorMessage(error, "Could not change password."); showAlert(alert, "error"); }
		finally { setIsChangingPassword(false); }
	};

	const sendVerification = async () => {
		setIsSendingVerification(true);
		try { const response = await api.post("/auth/email-verification/request"); const message = response.data.message; showAlert(message, message.includes("could not") ? "error" : message.includes("recently") ? "info" : "success"); }
		catch (error: unknown) { const alert = getApiErrorMessage(error, "Could not send verification email."); showAlert(alert, "error"); }
		finally { setIsSendingVerification(false); }
	};

	return (
		<div className="space-y-6 animate-in fade-in duration-500 max-w-3xl">
			<div className="mb-8">
				<h1 className="text-2xl sm:text-3xl font-heading font-black text-slate-900">Account Settings</h1>
				<p className="text-sm text-slate-500 mt-1">Update your profile and security preferences.</p>
			</div>

			<Card className="p-6 border-slate-200 mb-6 bg-slate-50/50">
				<h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Permanent Details</h3>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label className="text-xs font-bold text-slate-500 uppercase ml-1">Username</label>
						<div className="flex items-center gap-3 mt-1 px-4 py-3 bg-slate-100/50 border border-slate-200 rounded-xl text-slate-700 font-medium cursor-not-allowed">
							<AtSign className="w-4 h-4 text-slate-400" />
							<span>{user?.username}</span>
						</div>
					</div>
					<div>
						<label className="text-xs font-bold text-slate-500 uppercase ml-1">University Email</label>
						<div className="flex items-center gap-3 mt-1 px-4 py-3 bg-slate-100/50 border border-slate-200 rounded-xl text-slate-700 font-medium cursor-not-allowed">
							<Mail className="w-4 h-4 text-slate-400" />
							<span>{user?.email}</span>
						</div>
					</div>
				</div>
			</Card>

			<Card className="p-6 border-slate-200 mb-6">
				<h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Profile</h3>
				<div className="space-y-4 max-w-md">
					<div>
						<label className="text-xs font-bold text-slate-700 uppercase ml-1">Full Name</label>
						<div className="relative mt-1">
							<div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
								<User className="h-5 w-5 text-slate-400" />
							</div>
							<input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="block w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-slate-900" />
						</div>
					</div>
					{user?.role === "driver" && (
						<div>
							<label className="text-xs font-bold text-slate-700 uppercase ml-1">Vehicle Type</label>
							<select value={busType} disabled aria-describedby="vehicle-type-help" className="block w-full px-4 py-3 mt-1 bg-slate-100 border border-slate-200 rounded-xl font-medium text-slate-500 cursor-not-allowed">
								<option value="shuttle">Korope Shuttle (₦250 Fare)</option>
								<option value="macopolo">Macopolo Bus (₦150 Fare)</option>
								<option value="cng">CNG Bus (₦250 Fare)</option>
							</select>
							<p id="vehicle-type-help" className="mt-1 text-xs text-slate-500">Vehicle type is set during registration and cannot be changed.</p>
						</div>
					)}
					<Button className="px-6" onClick={saveProfile} isLoading={isSaving}>Save Changes</Button>
				</div>
			</Card>

			{!user?.email_verified && (
				<Card className="p-6 border-slate-200 mb-6">
					<h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Email verification</h3>
					<p className="text-sm text-slate-600 mb-3">Verify your university email to secure your account.</p>
					<Button className="px-5" onClick={sendVerification} isLoading={isSendingVerification}>Send verification email</Button>
				</Card>
			)}

			<Card className="p-6 border-slate-200">
				<h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Change Password</h3>
				<div className="space-y-3 max-w-md">
					{[["Current password", currentPassword, setCurrentPassword], ["New password", newPassword, setNewPassword], ["Confirm new password", confirmPassword, setConfirmPassword]].map(([label, value, setter]) => { const field = String(label); const visible = visiblePasswordField === field; return <div key={field}><label className="text-xs font-bold text-slate-700 uppercase ml-1">{field}</label><div className="relative mt-1"><LockKeyhole className="absolute left-4 top-3.5 w-4 h-4 text-slate-400"/><input type={visible ? "text" : "password"} value={String(value)} onChange={(e) => (setter as (value: string) => void)(e.target.value)} className="block w-full pl-11 pr-12 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-900" /><PasswordVisibilityButton visible={visible} onClick={() => setVisiblePasswordField(visible ? null : field)} /></div></div>})}
					<Button className="px-6" onClick={changePassword} isLoading={isChangingPassword}>Change Password</Button>
				</div>
			</Card>
		</div>
	);
}

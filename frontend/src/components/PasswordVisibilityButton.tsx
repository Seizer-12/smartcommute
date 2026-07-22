import { Eye, EyeOff } from "lucide-react";

interface PasswordVisibilityButtonProps {
	visible: boolean;
	onClick: () => void;
}

export function PasswordVisibilityButton({ visible, onClick }: PasswordVisibilityButtonProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-label={visible ? "Hide password" : "Show password"}
			aria-pressed={visible}
			className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
		>
			{visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
		</button>
	);
}

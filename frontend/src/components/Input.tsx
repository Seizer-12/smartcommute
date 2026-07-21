import type React from "react";
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
	label: string;
	icon: React.ReactNode;
	error?: string;
}

export const Input: React.FC<InputProps> = ({ label, icon, error, className = "", ...props }) => {
	return (
		<div className={`w-full ${className}`}>
			<label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">{label}</label>
			<div className="relative flex items-center group">
				<div className="absolute left-4 text-slate-400 transition-colors group-focus-within:text-blue-500 pointer-events-none">
					{icon}
				</div>
				<input
					{...props}
					className={`w-full bg-white border ${
						error
							? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
							: "border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
					} rounded-xl py-3 sm:py-3.5 pl-11 pr-4 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all shadow-sm`}
				/>
			</div>
			{error && (
				<span className="text-[11px] font-medium text-red-500 mt-1.5 ml-1 block">
					{error}
				</span>
			)}
		</div>
	);
};

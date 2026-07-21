import type React from "react";
interface SwitcherProps {
	activeRole: "commuter" | "driver";
	onChange: (role: "commuter" | "driver") => void;
}

export const RoleSwitcher: React.FC<SwitcherProps> = ({ activeRole, onChange }) => {
	return (
		<div className="grid grid-cols-2 p-1 bg-slate-50 rounded-xl border border-slate-200 mb-8 shadow-inner">
			<button
				type="button"
				onClick={() => onChange("commuter")}
				className={`py-2 text-[11px] sm:text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
					activeRole === "commuter"
						? "bg-white text-blue-700 shadow-sm border border-slate-200/60"
						: "text-slate-500 hover:text-slate-700 hover:bg-slate-100/50"
				}`}
			>
				Commuter
			</button>
			<button
				type="button"
				onClick={() => onChange("driver")}
				className={`py-2 text-[11px] sm:text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
					activeRole === "driver"
						? "bg-white text-amber-600 shadow-sm border border-slate-200/60"
						: "text-slate-500 hover:text-slate-700 hover:bg-slate-100/50"
				}`}
			>
				Driver
			</button>
		</div>
	);
};

import type React from "react";
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	children: React.ReactNode;
	variant?: "primary" | "secondary" | "outline";
	roleTheme?: "commuter" | "driver";
	isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
	children,
	variant = "primary",
	roleTheme = "commuter",
	isLoading = false,
	className = "",
	disabled,
	...props
}) => {
	const baseStyles =
		"w-full py-3 sm:py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all duration-200 shadow-sm flex items-center justify-center space-x-2 outline-none focus:ring-4 focus:ring-offset-1";

	// Dynamic color switching based on the user's selected role
	const themeStyles = {
		primary:
			roleTheme === "commuter"
				? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20 focus:ring-blue-500/30 border border-transparent"
				: "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20 focus:ring-amber-500/30 border border-transparent",
		secondary:
			"bg-slate-100 hover:bg-slate-200 text-slate-700 border border-transparent focus:ring-slate-200",
		outline:
			"bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 focus:ring-slate-100 shadow-none",
	};

	const activeStyle = themeStyles[variant];
	const disabledStyle = "opacity-60 cursor-not-allowed";

	return (
		<button
			className={`${baseStyles} ${activeStyle} ${
				disabled || isLoading ? disabledStyle : "cursor-pointer"
			} ${className}`}
			disabled={disabled || isLoading}
			{...props}
		>
			{isLoading ? (
				<div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
			) : (
				children
			)}
		</button>
	);
};

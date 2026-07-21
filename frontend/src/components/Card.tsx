import type React from "react";
import { motion } from "framer-motion";

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({
	children,
	className = "",
}) => {
	return (
		<motion.div
			initial={{ opacity: 0, y: 15 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -15 }}
			transition={{ duration: 0.3, ease: "easeOut" }}
			className={`bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/60 ${className}`}
		>
			{children}
		</motion.div>
	);
};

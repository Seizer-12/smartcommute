import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
	Activity,
	Bus,
	QrCode,
	Clock,
	UserPlus,
	Eye,
	CreditCard,
	ShieldCheck,
	Navigation,
	ArrowRight,
	Info,
	Cpu,
} from "lucide-react";
import { Link } from "react-router-dom";

// High-Performance Canvas Particle Network (Light Theme Version)
function BackgroundNetwork() {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		let animationFrameId: number;
		let particles: Array<{ x: number; y: number; vx: number; vy: number; radius: number }> = [];

		const resizeCanvas = () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
			initParticles();
		};

		const initParticles = () => {
			particles = [];
			const count = Math.min(Math.floor(canvas.width / 12), 50);
			for (let i = 0; i < count; i++) {
				particles.push({
					x: Math.random() * canvas.width,
					y: Math.random() * canvas.height,
					vx: (Math.random() - 0.5) * 0.4,
					vy: (Math.random() - 0.5) * 0.4,
					radius: Math.random() * 1.5 + 1,
				});
			}
		};

		const draw = () => {
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.fillStyle = "rgba(37, 99, 235, 0.15)"; // Visible soft blue fill
			ctx.strokeStyle = "rgba(37, 99, 235, 0.08)"; // Visible soft blue connections

			for (let i = 0; i < particles.length; i++) {
				const p1 = particles[i];
				p1.x += p1.vx;
				p1.y += p1.vy;
				if (p1.x < 0 || p1.x > canvas.width) p1.vx *= -1;
				if (p1.y < 0 || p1.y > canvas.height) p1.vy *= -1;
				ctx.beginPath();
				ctx.arc(p1.x, p1.y, p1.radius, 0, Math.PI * 2);
				ctx.fill();

				for (let j = i + 1; j < particles.length; j++) {
					const p2 = particles[j];
					const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
					if (dist < 120) {
						ctx.beginPath();
						ctx.moveTo(p1.x, p1.y);
						ctx.lineTo(p2.x, p2.y);
						ctx.stroke();
					}
				}
			}
			animationFrameId = requestAnimationFrame(draw);
		};

		window.addEventListener("resize", resizeCanvas);
		resizeCanvas();
		draw();

		return () => {
			cancelAnimationFrame(animationFrameId);
			window.removeEventListener("resize", resizeCanvas);
		};
	}, []);

	return <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />;
}

export default function LandingPage() {
	const features = [
		{
			icon: <Activity className="w-6 h-6 text-blue-600" />,
			title: "Live Congestion Tracking",
			desc: "Monitor passenger density at the school park instantly before leaving your lecture hall.",
		},
		{
			icon: <Bus className="w-6 h-6 text-blue-600" />,
			title: "Smart Bus Dispatch",
			desc: "Automated routing alerts available shuttle drivers immediately when peak passenger thresholds are met.",
		},
		{
			icon: <QrCode className="w-6 h-6 text-blue-600" />,
			title: "QR Fare Settlement",
			desc: "Scan unique driver cards for seamless, direct fare transactions powered securely via Paystack.",
		},
		{
			icon: <Clock className="w-6 h-6 text-blue-600" />,
			title: "Predictive Wait Diagnostics",
			desc: "Get micro-forecasts on actual vehicle departures based on current commuter-to-bus capacity ratios.",
		},
	];

	return (
		<div className="w-full">
			<BackgroundNetwork />

			<header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
					<Link to="/" className="flex items-center gap-2 min-w-0">
						<div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
							<Bus className="w-5 h-5" />
						</div>
						<span className="font-heading font-black text-lg text-slate-900 truncate">SmartCommute</span>
					</Link>

					<nav className="hidden md:flex items-center gap-6 text-sm font-bold text-slate-600">
						<a href="#about" className="hover:text-blue-600 transition-colors">About</a>
						<a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
						<a href="#process" className="hover:text-blue-600 transition-colors">Process</a>
					</nav>

					<div className="flex items-center gap-2 shrink-0">
						<Link to="/auth" className="hidden sm:inline-flex px-4 py-2 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors">Sign in</Link>
						<Link to="/auth" state={{ role: "commuter" }} className="inline-flex px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors">Get started</Link>
					</div>
				</div>
			</header>

			{/* Hero Section */}
			<section className="relative px-4 sm:px-6 pt-12 sm:pt-20 pb-16 sm:pb-20 max-w-5xl mx-auto text-center flex flex-col items-center z-10">
				<motion.div
					initial={{ opacity: 0, y: -10 }}
					animate={{ opacity: 1, y: 0 }}
					className="inline-flex items-center space-x-2.5 bg-blue-100/50 border border-blue-200 px-4 py-1.5 rounded-full mb-6 sm:mb-8 shadow-sm"
				>
					<span className="relative flex h-2 w-2">
						<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
						<span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
					</span>
					<span className="text-[10px] sm:text-xs font-bold text-blue-800 uppercase tracking-wide">
						Live Feed: 47 Active Commuters at Park
					</span>
				</motion.div>

				<motion.h1
					initial={{ opacity: 0, y: 15 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.1 }}
					className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-heading font-black tracking-tight leading-[1.1] max-w-4xl text-slate-900"
				>
					Smarter{" "}
					<span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-sky-500">
						Journeys.
					</span>
					<br className="hidden sm:block" /> Fewer Waits.
				</motion.h1>

				<motion.p
					initial={{ opacity: 0, y: 15 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.2 }}
					className="mt-6 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed px-2"
				>
					An Intelligent Transportation System tailored entirely for the University of
					Ilorin park node. Sync transit schedules, access real-time metrics, and clear
					driver fares cashlessly.
				</motion.p>

				<motion.div
					initial={{ opacity: 0, y: 15 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.3 }}
					className="mt-10 flex flex-col sm:flex-row justify-center items-center gap-4 w-full px-4 sm:px-0"
				>
					<Link
						to="/auth"
						state={{ role: "commuter" }}
						className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-4 rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center space-x-2 group text-sm"
					>
						<span>Join as Commuter</span>
						<ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
					</Link>
					<Link
						to="/auth"
						state={{ role: "driver" }}
						className="w-full sm:w-auto bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold px-8 py-4 rounded-xl shadow-sm transition-all text-sm flex items-center justify-center"
					>
						Join as Driver
					</Link>
				</motion.div>
			</section>

			{/* About Section */}
			<section
				id="about"
				className="px-4 sm:px-6 py-16 sm:py-24 max-w-6xl mx-auto z-10 relative scroll-mt-24"
			>
				<div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
					<div>
						<div className="inline-flex items-center space-x-2 bg-sky-50 border border-sky-100 px-3 py-1 rounded-md mb-6 text-xs font-semibold text-sky-700 uppercase tracking-wide">
							<Info className="w-3.5 h-3.5" />
							<span>System Concept</span>
						</div>
						<h2 className="text-3xl sm:text-4xl font-heading font-black tracking-tight text-slate-900 mb-6 leading-tight">
							Balancing Campus Mobility <br className="hidden md:block" /> With
							High-Tech Infrastructure.
						</h2>
						<p className="text-slate-600 text-base leading-relaxed mb-4">
							SmartCommute was engineered to directly address peak transit hours and
							structural congestion at the University of Ilorin main school park node.
							By deploying dynamic logic arrays, the application evaluates vehicular
							presence against student population demands.
						</p>
						<p className="text-slate-600 text-base leading-relaxed">
							Whether you are a student coordinating lecture routes or a shuttle
							operator looking to stabilize daily yield metrics, our dashboard
							coordinates your flow seamlessly.
						</p>
					</div>

					<div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-xl shadow-slate-200/50 relative overflow-hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="absolute -top-10 -right-10 p-3 opacity-[0.03]">
							<Cpu className="w-64 h-64 text-blue-600" />
						</div>

						<div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 z-10">
							<span className="text-xs font-bold text-slate-500 block mb-1 uppercase tracking-wider">
								Active Fleet
							</span>
							<span className="text-3xl font-heading font-black text-blue-600">
								14 Cars
							</span>
						</div>
						<div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 z-10">
							<span className="text-xs font-bold text-slate-500 block mb-1 uppercase tracking-wider">
								Avg Queue Time
							</span>
							<span className="text-3xl font-heading font-black text-blue-600">
								4.5 Min
							</span>
						</div>
						<div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col justify-center sm:col-span-2 z-10">
							<span className="text-xs font-bold text-slate-500 block mb-2 uppercase tracking-wider">
								Current Load Factor
							</span>
							<div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
								<div className="bg-gradient-to-r from-sky-400 to-blue-600 h-full w-[68%]" />
							</div>
							<span className="text-right text-[11px] font-bold text-blue-600 mt-2">
								68% Optimal
							</span>
						</div>
					</div>
				</div>
			</section>

			{/* Analytics Banner */}
			<section className="bg-white border-y border-slate-200 py-6 z-10 relative">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row flex-wrap justify-center items-center gap-4 sm:gap-12 md:gap-16 text-xs font-semibold tracking-wide text-slate-600 uppercase text-center">
					<div className="flex items-center space-x-2 pb-3 border-b sm:pb-0 sm:border-b-0 sm:border-r border-slate-200 sm:pr-8 w-full sm:w-auto justify-center">
						<span className="text-blue-500 text-lg">⚡</span>
						<span>Unilorin Hub Node</span>
					</div>
					<div className="flex items-center space-x-2 pb-3 border-b sm:pb-0 sm:border-b-0 sm:border-r border-slate-200 sm:pr-8 w-full sm:w-auto justify-center">
						<ShieldCheck className="w-5 h-5 text-blue-500" />
						<span>Paystack Escrow Deployed</span>
					</div>
					<div className="flex items-center space-x-2 w-full sm:w-auto justify-center">
						<Navigation className="w-5 h-5 text-blue-500" />
						<span>Real-time Data Correlation</span>
					</div>
				</div>
			</section>

			{/* Features Grid */}
			<section
				id="features"
				className="px-4 sm:px-6 py-16 sm:py-24 max-w-6xl mx-auto z-10 relative scroll-mt-24"
			>
				<div className="text-center mb-12 sm:mb-16">
					<h2 className="text-3xl md:text-4xl font-heading font-black tracking-tight text-slate-900">
						Engineered for Operational Clarity
					</h2>
					<p className="text-slate-600 mt-4 text-base max-w-2xl mx-auto px-4">
						No unnecessary components. Just precise tracking vectors designed to
						streamline transit loop processes for students and drivers alike.
					</p>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
					{features.map((feat, idx) => (
						<div
							key={idx}
							className="bg-white p-6 rounded-3xl border border-slate-200 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-900/5 transition-all duration-300 flex flex-col justify-between group"
						>
							<div>
								<div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
									{feat.icon}
								</div>
								<h3 className="text-lg font-bold text-slate-900 mb-3">
									{feat.title}
								</h3>
								<p className="text-slate-600 text-sm leading-relaxed">
									{feat.desc}
								</p>
							</div>
						</div>
					))}
				</div>
			</section>

			{/* Process Timeline */}
			<section
				id="process"
				className="px-4 sm:px-6 py-16 sm:py-24 bg-white border-t border-slate-200 z-10 relative scroll-mt-24"
			>
				<div className="max-w-5xl mx-auto">
					<div className="text-center mb-12 sm:mb-16">
						<h2 className="text-3xl md:text-4xl font-heading font-black text-slate-900">
							System Engagement Model
						</h2>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
						{[
							{
								icon: <UserPlus className="w-6 h-6" />,
								title: "Initialize Identity",
								desc: "Instantiate your secure profile role credentials.",
							},
							{
								icon: <Eye className="w-6 h-6" />,
								title: "Verify Diagnostics",
								desc: "Audit live density diagnostics directly from the main park.",
							},
							{
								icon: <CreditCard className="w-6 h-6" />,
								title: "Scan Fare & Clear",
								desc: "Execute cashless microtransactions instantly via unique driver QR anchors.",
							},
						].map((step, idx) => (
							<div
								key={idx}
								className="relative flex flex-col items-center text-center"
							>
								<div className="w-16 h-16 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-6 z-10 shadow-sm">
									{step.icon}
								</div>
								<h4 className="text-xl font-bold text-slate-900 mb-2">
									{step.title}
								</h4>
								<p className="text-slate-600 text-sm max-w-[220px] leading-relaxed">
									{step.desc}
								</p>
								{/* Horizontal line connector - only visible on desktop (md+) */}
								{idx < 2 && (
									<div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-[2px] bg-slate-100 z-0" />
								)}
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className="border-t border-slate-200 bg-white py-8 sm:py-10 px-4 sm:px-6 text-center text-sm text-slate-500 z-10 relative">
				<div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
					<p className="font-medium">
						&copy; {new Date().getFullYear()} SmartCommute. Automated ITS Platform.
					</p>
					<div className="flex space-x-6 font-medium">
						<button
							onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
							className="hover:text-blue-600 transition-colors cursor-pointer"
						>
							Back to Top
						</button>
						<span className="hover:text-blue-600 transition-colors cursor-pointer">
							Security Manifest
						</span>
					</div>
				</div>
			</footer>
		</div>
	);
}

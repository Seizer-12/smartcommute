import { useEffect, useState } from "react";
import { api } from "../lib/axios"; // Make sure this points to your axios instance!

// UNILORIN Terminus Coordinates (Replace with exact coordinates later)
const PARK_LAT = 8.4845;
const PARK_LNG = 4.675;
const GEOFENCE_RADIUS_METERS = 50;

// Haversine formula to calculate distance in meters
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
	const R = 6371e3;
	const φ1 = (lat1 * Math.PI) / 180,
		φ2 = (lat2 * Math.PI) / 180;
	const Δφ = ((lat2 - lat1) * Math.PI) / 180,
		Δλ = ((lon2 - lon1) * Math.PI) / 180;
	const a =
		Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
		Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
	return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function useGeofencedQueue() {
	const [isInPark, setIsInPark] = useState(false);

	useEffect(() => {
		let watchId: number | undefined;
		let heartbeatInterval: ReturnType<typeof setInterval> | undefined;

		if ("geolocation" in navigator) {
			watchId = navigator.geolocation.watchPosition(
				(position) => {
					const distance = getDistance(
						position.coords.latitude,
						position.coords.longitude,
						PARK_LAT,
						PARK_LNG
					);

					const currentlyInPark = distance <= GEOFENCE_RADIUS_METERS;
					setIsInPark(currentlyInPark);

					if (currentlyInPark && !heartbeatInterval) {
						// First ping immediately, then every 30 seconds
						api.post("/queue/heartbeat").catch(console.error);
						heartbeatInterval = setInterval(() => api.post("/queue/heartbeat").catch(console.error), 30000);
					} else if (!currentlyInPark && heartbeatInterval) {
						// They walked away, stop pinging and tell server they left
						clearInterval(heartbeatInterval);
						api.post("/queue/leave").catch(console.error);
					}
				},
				(error) => console.error("Location error:", error),
				{ enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
			);
		}

		return () => {
			if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
			if (heartbeatInterval) clearInterval(heartbeatInterval);
		};
	}, []);

	return { isInPark };
}

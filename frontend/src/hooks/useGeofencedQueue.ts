import { useEffect, useRef, useState } from "react";
import { api } from "../lib/axios";

type HeartbeatResponse = {
	in_geofence: boolean;
};

export function useGeofencedQueue() {
	const [isInPark, setIsInPark] = useState(false);
	const [locationError, setLocationError] = useState(() => {
		if (typeof navigator === "undefined") return "";
		return "geolocation" in navigator ? "" : "Geolocation is not available in this browser.";
	});
	const latestPosition = useRef<GeolocationPosition | null>(null);

	useEffect(() => {
		let watchId: number | undefined;
		let heartbeatInterval: ReturnType<typeof setInterval> | undefined;

		if (!("geolocation" in navigator)) return;

		const sendHeartbeat = (position: GeolocationPosition) => {
			api
				.post<HeartbeatResponse>("/queue/heartbeat", {
					latitude: position.coords.latitude,
					longitude: position.coords.longitude,
					accuracy_meters: position.coords.accuracy,
				})
				.then(({ data }) => {
					setIsInPark(data.in_geofence);
					setLocationError("");
				})
				.catch(() => {
					setIsInPark(false);
					setLocationError("We could not confirm your location with SmartCommute.");
				});
		};

		if ("geolocation" in navigator) {
			watchId = navigator.geolocation.watchPosition(
				(position) => {
					latestPosition.current = position;
					sendHeartbeat(position);
					if (!heartbeatInterval) {
						heartbeatInterval = setInterval(() => {
							if (latestPosition.current) sendHeartbeat(latestPosition.current);
						}, 30000);
					}
				},
				() => {
					setIsInPark(false);
					setLocationError("Allow location access to use terminus queue features.");
				},
				{ enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
			);
		}

		return () => {
			if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
			if (heartbeatInterval) clearInterval(heartbeatInterval);
		};
	}, []);

	return { isInPark, locationError };
}

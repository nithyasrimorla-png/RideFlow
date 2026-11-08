
import { useEffect, useRef, useState } from "react";

const TRACKING_API = "http://localhost:8080/api/tracking";
const LOCATION_UPDATE_INTERVAL = 5000;

export default function DriverLocationSharing({
  rideId,
  driverId,
  isOnline,
  rideStatus,
}) {
  const [message, setMessage] = useState("Waiting for GPS permission...");
  const [sharing, setSharing] = useState(false);
  const lastSentRef = useRef(0);
  const sendingRef = useRef(false);

  useEffect(() => {
    const activeRide =
      rideStatus === "ACCEPTED" || rideStatus === "ONGOING";

    if (!isOnline || !activeRide || !rideId || !driverId) {
      setSharing(false);
      setMessage("Location sharing is inactive.");
      return;
    }

    if (!navigator.geolocation) {
      setSharing(false);
      setMessage("Geolocation is not supported by this browser.");
      return;
    }

    let active = true;
    let watchId = null;

    setSharing(false);
    setMessage("Requesting browser location permission...");

    const sendLocation = async (position) => {
      if (!active || sendingRef.current) return;

      const now = Date.now();

      if (now - lastSentRef.current < LOCATION_UPDATE_INTERVAL) {
        return;
      }

      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      lastSentRef.current = now;
      sendingRef.current = true;

      try {
        const response = await fetch(
          `${TRACKING_API}/rides/${rideId}/drivers/${driverId}/location`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ latitude, longitude }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Unable to update driver location."
          );
        }

        if (active) {
          setSharing(true);
          setMessage("Your live location is being shared.");
        }
      } catch (error) {
        if (active) {
          setSharing(false);
          setMessage(error.message || "Location update failed.");
        }
      } finally {
        sendingRef.current = false;
      }
    };

    const handleLocationError = (error) => {
      if (!active) return;

      setSharing(false);

      if (error.code === error.PERMISSION_DENIED) {
        setMessage("Location permission denied. Allow location access in your browser.");
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        setMessage("Your device location is currently unavailable.");
      } else if (error.code === error.TIMEOUT) {
        setMessage("GPS request timed out. Waiting for another location update...");
      } else {
        setMessage("Unable to retrieve your current location.");
      }
    };

    watchId = navigator.geolocation.watchPosition(
      sendLocation,
      handleLocationError,
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 20000,
      }
    );

    return () => {
      active = false;

      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [rideId, driverId, isOnline, rideStatus]);

  const activeRide =
    rideStatus === "ACCEPTED" || rideStatus === "ONGOING";

  if (!isOnline || !activeRide) {
    return null;
  }

  return (
    <section className="my-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span
          className={`h-3 w-3 rounded-full ${
            sharing ? "bg-green-500" : "bg-yellow-500"
          }`}
        />

        <div>
          <h3 className="font-semibold text-gray-800">
            Driver GPS Tracking
          </h3>

          <p className="mt-1 text-sm text-gray-600">
            {message}
          </p>
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-400">
        Location updates are sent approximately every 5 seconds when your
        device reports a new position.
      </p>
    </section>
  );
}

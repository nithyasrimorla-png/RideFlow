
import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import {
  CarFront,
  MapPin,
  RefreshCw,
  Radio,
  Clock3,
  AlertCircle,
} from "lucide-react";
import "leaflet/dist/leaflet.css";

const TRACKING_API = "http://localhost:8080/api/tracking";
const REFRESH_INTERVAL = 5000;

const driverIcon = L.divIcon({
  className: "live-driver-marker",
  html: `
    <div style="
      width: 42px;
      height: 42px;
      background: #32877D;
      border: 3px solid white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      box-shadow: 0 2px 10px rgba(0,0,0,0.25);
    ">
      <span style="font-size: 21px;">🚕</span>
    </div>
  `,
  iconSize: [42, 42],
  iconAnchor: [21, 21],
});

function formatUpdatedAt(value) {
  if (!value) return "Update time unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Update time unavailable";
  }

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function MapCenterUpdater({ position }) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.setView(position, Math.max(map.getZoom(), 15));
    }
  }, [position, map]);

  return null;
}

function DriverMap({ location }) {
  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return (
      <div style={{ padding: "20px", color: "#b45309" }}>
        Driver location coordinates are invalid.
      </div>
    );
  }

  const position = [latitude, longitude];

  return (
    <div
      style={{
        height: "250px",
        width: "100%",
        borderRadius: "12px",
        overflow: "hidden",
      }}
    >
      <MapContainer
        center={position}
        zoom={15}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapCenterUpdater position={position} />

        <Marker position={position} icon={driverIcon} />
      </MapContainer>
    </div>
  );
}

function RiderLiveTracking({ rides = [], riderId }) {
  const [locations, setLocations] = useState({});
  const [loading, setLoading] = useState(false);
  const [trackingError, setTrackingError] = useState("");

  const isFetchingRef = useRef(false);

  // Do not depend on driverId being present in ride-history data.
  const activeRides = rides.filter((ride) => {
    const status = String(ride.status || "").toUpperCase();
    const rideId = ride.rideId ?? ride.id;

    return (
      ["ACCEPTED", "ONGOING"].includes(status) &&
      rideId != null
    );
  });

  const activeRideKey = activeRides
    .map((ride) => ride.rideId ?? ride.id)
    .sort((a, b) => Number(a) - Number(b))
    .join(",");

  const fetchDriverLocations = useCallback(async () => {
    if (!riderId || !activeRideKey) {
      setLoading(false);
      return;
    }

    if (isFetchingRef.current) return;

    isFetchingRef.current = true;
    setLoading(true);

    try {
      const currentActiveRides = activeRideKey
        .split(",")
        .filter(Boolean);

      const results = await Promise.allSettled(
        currentActiveRides.map(async (rideId) => {
          const response = await axios.get(
            `${TRACKING_API}/rides/${rideId}/riders/${riderId}/driver-location`
          );

          return {
            rideId,
            location: response.data,
          };
        })
      );

      setLocations((previous) => {
        const updated = { ...previous };

        results.forEach((result) => {
          if (result.status === "fulfilled") {
            updated[result.value.rideId] = result.value.location;
          }
        });

        return updated;
      });

      const failed = results.some(
        (result) => result.status === "rejected"
      );

      setTrackingError(
        failed
          ? "Some driver locations are not available yet. Retrying automatically."
          : ""
      );
    } catch (error) {
      console.error("Driver location tracking error:", error);
      setTrackingError(
        "Unable to retrieve driver locations. Retrying automatically."
      );
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [riderId, activeRideKey]);

  useEffect(() => {
    if (!riderId || !activeRideKey) {
      setLoading(false);
      return;
    }

    fetchDriverLocations();

    const intervalId = window.setInterval(
      fetchDriverLocations,
      REFRESH_INTERVAL
    );

    return () => window.clearInterval(intervalId);
  }, [fetchDriverLocations, riderId, activeRideKey]);

  if (activeRides.length === 0) {
    return null;
  }

  return (
    <section
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "16px",
        padding: "22px",
        marginBottom: "24px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          marginBottom: "18px",
        }}
      >
        <div>
          <span className="rider-eyebrow">
            LIVE RIDE TRACKING
          </span>

          <h2 style={{ margin: "6px 0" }}>
            Track your driver
          </h2>

          <p
            style={{
              margin: 0,
              color: "#64748b",
              fontSize: "13px",
            }}
          >
            Driver location refreshes automatically every 5 seconds.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            color: "#32877D",
            fontSize: "13px",
            fontWeight: 600,
          }}
        >
          <Radio size={17} />
          Live
        </div>
      </div>

      {trackingError && (
        <div
          style={{
            padding: "10px",
            marginBottom: "14px",
            background: "#fff7ed",
            color: "#9a3412",
            borderRadius: "8px",
            fontSize: "13px",
          }}
        >
          <AlertCircle
            size={15}
            style={{ verticalAlign: "middle" }}
          />{" "}
          {trackingError}
        </div>
      )}

      <div style={{ display: "grid", gap: "20px" }}>
        {activeRides.map((ride) => {
          const rideId = ride.rideId ?? ride.id;
          const location = locations[rideId];
          const status = String(ride.status || "").toUpperCase();

          return (
            <article
              key={rideId}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                padding: "15px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "10px",
                  marginBottom: "14px",
                }}
              >
                <div>
                  <strong>Ride #{rideId}</strong>

                  <div
                    style={{
                      color: "#64748b",
                      fontSize: "13px",
                      marginTop: "5px",
                    }}
                  >
                    <CarFront
                      size={14}
                      style={{ verticalAlign: "middle" }}
                    />{" "}
                    {ride.driverName ||
                      location?.driverName ||
                      "Your driver"}
                  </div>
                </div>

                <span
                  className={`ride-status ride-status-${status.toLowerCase()}`}
                >
                  {status}
                </span>
              </div>

              {location ? (
                <>
                  <DriverMap location={location} />

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "10px",
                      marginTop: "12px",
                      color: "#64748b",
                      fontSize: "12px",
                    }}
                  >
                    <span>
                      <MapPin
                        size={14}
                        style={{ verticalAlign: "middle" }}
                      />{" "}
                      {Number(location.latitude).toFixed(5)},{" "}
                      {Number(location.longitude).toFixed(5)}
                    </span>

                    <span>
                      <Clock3
                        size={14}
                        style={{ verticalAlign: "middle" }}
                      />{" "}
                      Updated {formatUpdatedAt(location.updatedAt)}
                    </span>
                  </div>
                </>
              ) : (
                <div
                  style={{
                    padding: "28px 12px",
                    textAlign: "center",
                    background: "#f8fafc",
                    borderRadius: "10px",
                    color: "#64748b",
                  }}
                >
                  <CarFront size={28} />

                  <p
                    style={{
                      margin: "10px 0 4px",
                      fontWeight: 600,
                    }}
                  >
                    Waiting for driver's location
                  </p>

                  <small>
                    The map will appear when the driver's first GPS
                    update arrives.
                  </small>
                </div>
              )}
            </article>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "7px",
          marginTop: "14px",
          color: "#64748b",
          fontSize: "12px",
        }}
      >
        <RefreshCw
          size={13}
          className={loading ? "ride-spin" : ""}
        />
        Automatically checking driver locations
      </div>
    </section>
  );
}

export default RiderLiveTracking;

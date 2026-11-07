
import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import {
  CarFront,
  MapPin,
  Navigation,
  Wallet,
  Clock3,
  ArrowRight,
  LogOut,
  RefreshCw,
  CheckCircle2,
  CalendarDays,
  Route,
  AlertCircle,
  LoaderCircle,
  UserRound,
  XCircle,
} from "lucide-react";

import RideLocationPicker from "./components/RideLocationPicker";

const RIDE_API = "http://localhost:8080/api/rides";
const FARE_API = "http://localhost:8080/api/fares";
const REFRESH_INTERVAL = 15000;

const RIDE_STEPS = [
  "REQUESTED",
  "ACCEPTED",
  "ONGOING",
  "COMPLETED",
];

function formatDate(date) {
  if (!date) return "Date unavailable";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Date unavailable";
  }

  return parsedDate.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
}

function formatCoordinates(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    return "";
  }

  const [latitude, longitude] = coordinates;

  return `Lat: ${latitude.toFixed(5)}, Lng: ${longitude.toFixed(5)}`;
}

function getErrorMessage(err, fallback) {
  return (
    err.response?.data?.message ||
    err.response?.data?.error ||
    fallback
  );
}

function RideProgress({ status }) {
  const currentStep = RIDE_STEPS.indexOf(status);

  if (status === "CANCELLED") {
    return (
      <div className="ride-progress ride-progress-cancelled">
        <span className="ride-progress-cancelled-label">
          <AlertCircle size={15} />
          Ride cancelled
        </span>
      </div>
    );
  }

  return (
    <div className="ride-progress">
      {RIDE_STEPS.map((step, index) => {
        const completed = currentStep >= index;
        const current = currentStep === index;

        return (
          <div
            className={`ride-progress-step ${
              completed ? "completed" : ""
            } ${current ? "current" : ""}`}
            key={step}
          >
            <div className="ride-progress-marker">
              {completed ? (
                <CheckCircle2 size={16} />
              ) : (
                <span>{index + 1}</span>
              )}
            </div>

            <small>{step}</small>
          </div>
        );
      })}
    </div>
  );
}

function RiderDashboard({ user, onLogout }) {
  const [rides, setRides] = useState([]);
  const [loadingRides, setLoadingRides] = useState(true);

  const [pickupLocation, setPickupLocation] = useState("");
  const [dropLocation, setDropLocation] = useState("");
  const [distanceKm, setDistanceKm] = useState("");

  const [mapResetKey, setMapResetKey] = useState(0);

  const [fare, setFare] = useState(null);
  const [loadingFare, setLoadingFare] = useState(false);
  const [booking, setBooking] = useState(false);

  const [cancelingRideId, setCancelingRideId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isFetchingRef = useRef(false);

  // Receive readable addresses from the map.
  const handleRouteChange = useCallback((route) => {
    setFare(null);
    setError("");
    setSuccess("");

    if (!route) {
      setPickupLocation("");
      setDropLocation("");
      setDistanceKm("");
      return;
    }

    setPickupLocation(
      route.pickupAddress || formatCoordinates(route.pickup)
    );

    setDropLocation(
      route.destinationAddress ||
        formatCoordinates(route.destination)
    );

    setDistanceKm(String(route.distanceKm));
  }, []);

  // Fetch rider's ride history.
  const fetchRides = useCallback(
    async ({ silent = false } = {}) => {
      if (!user?.userId) {
        setError(
          "Rider account information is missing. Please log in again."
        );
        setLoadingRides(false);
        return;
      }

      if (isFetchingRef.current) return;

      isFetchingRef.current = true;

      if (!silent) {
        setLoadingRides(true);
        setError("");
      }

      try {
        const response = await axios.get(
          `${RIDE_API}/rider/${user.userId}`
        );

        const fetchedRides = Array.isArray(response.data)
          ? response.data
          : [];

        setRides(fetchedRides);
        setError("");
      } catch (err) {
        setError(
          getErrorMessage(
            err,
            "Unable to load your ride history."
          )
        );
      } finally {
        isFetchingRef.current = false;

        if (!silent) {
          setLoadingRides(false);
        }
      }
    },
    [user?.userId]
  );

  // Initial load and automatic refresh.
  useEffect(() => {
    fetchRides();

    const intervalId = window.setInterval(() => {
      fetchRides({ silent: true });
    }, REFRESH_INTERVAL);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [fetchRides]);

  // Calculate fare using the map's driving distance.
  const handleFareEstimate = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");
    setFare(null);

    const distance = Number(distanceKm);

    if (!pickupLocation || !dropLocation) {
      setError(
        "Please select both pickup and destination on the map."
      );
      return;
    }

    if (!Number.isFinite(distance) || distance <= 0) {
      setError(
        "Please select two valid locations to calculate the route."
      );
      return;
    }

    if (pickupLocation === dropLocation) {
      setError(
        "Pickup and destination cannot be the same."
      );
      return;
    }

    setLoadingFare(true);

    try {
      const response = await axios.post(
        `${FARE_API}/calculate`,
        { distanceKm: distance }
      );

      setFare(response.data);
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Unable to calculate fare. Please check the backend."
        )
      );
    } finally {
      setLoadingFare(false);
    }
  };

  // Book a ride using readable addresses and calculated distance.
  const handleBookRide = async () => {
    if (!fare) {
      setError("Please calculate the fare before booking.");
      return;
    }

    if (!pickupLocation || !dropLocation || !distanceKm) {
      setError(
        "Please select your pickup and destination on the map."
      );
      return;
    }

    setBooking(true);
    setError("");
    setSuccess("");

    try {
      const response = await axios.post(
        `${RIDE_API}/book`,
        {
          riderId: user.userId,
          pickupLocation,
          dropLocation,
          distanceKm: Number(distanceKm),
        }
      );

      setSuccess(
        response.data.message ||
          "Your ride has been booked successfully!"
      );

      // Clear the selected journey.
      setPickupLocation("");
      setDropLocation("");
      setDistanceKm("");
      setFare(null);

      // Reset map markers, route, and addresses.
      setMapResetKey((previous) => previous + 1);

      await fetchRides();
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Unable to book your ride. Please try again."
        )
      );
    } finally {
      setBooking(false);
    }
  };

  // Cancel REQUESTED or ACCEPTED rides.
  const handleCancelRide = async (ride) => {
    const canCancel = ["REQUESTED", "ACCEPTED"].includes(
      ride.status
    );

    if (!canCancel) {
      setError("This ride can no longer be cancelled.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to cancel Ride #${ride.rideId}?`
    );

    if (!confirmed) return;

    setCancelingRideId(ride.rideId);
    setError("");
    setSuccess("");

    try {
      const response = await axios.put(
        `${RIDE_API}/${ride.rideId}/cancel/${user.userId}`
      );

      setRides((previousRides) =>
        previousRides.map((item) =>
          item.rideId === ride.rideId
            ? { ...item, status: "CANCELLED" }
            : item
        )
      );

      setSuccess(
        response.data?.message ||
          `Ride #${ride.rideId} has been cancelled successfully.`
      );

      await fetchRides({ silent: true });
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Unable to cancel this ride. Please try again."
        )
      );
    } finally {
      setCancelingRideId(null);
    }
  };

  const requestedRides = rides.filter(
    (ride) => ride.status === "REQUESTED"
  ).length;

  const completedRides = rides.filter(
    (ride) => ride.status === "COMPLETED"
  ).length;

  const activeRides = rides.filter(
    (ride) => ["ACCEPTED", "ONGOING"].includes(ride.status)
  ).length;

  const handleManualRefresh = () => {
    fetchRides();
  };

  return (
    <div className="rider-dashboard">
      <header className="rider-topbar">
        <a href="/" className="rider-brand">
          <span className="rider-brand-icon">
            <CarFront size={24} />
          </span>

          <span>
            ride<span>flow</span>
          </span>
        </a>

        <div className="rider-topbar-right">
          <div className="rider-profile">
            <div className="rider-avatar">
              {user?.name?.charAt(0)?.toUpperCase() || "R"}
            </div>

            <div>
              <strong>{user?.name || "Rider"}</strong>
              <small>Rider account</small>
            </div>
          </div>

          <button className="rider-logout" onClick={onLogout}>
            <LogOut size={17} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      <main className="rider-main">
        <section className="rider-welcome">
          <div>
            <span className="rider-eyebrow">RIDER DASHBOARD</span>

            <h1>
              Hello, {user?.name?.split(" ")[0] || "there"}!
            </h1>

            <p>Where would you like to go today?</p>
          </div>

          <div className="rider-welcome-icon">
            <CarFront size={38} />
          </div>
        </section>

        <section className="rider-stats">
          <article className="rider-stat-card">
            <div className="rider-stat-icon">
              <Route size={21} />
            </div>

            <div>
              <span>Total rides</span>
              <strong>{rides.length}</strong>
            </div>
          </article>

          <article className="rider-stat-card">
            <div className="rider-stat-icon">
              <Clock3 size={21} />
            </div>

            <div>
              <span>Active rides</span>
              <strong>{activeRides}</strong>
            </div>
          </article>

          <article className="rider-stat-card">
            <div className="rider-stat-icon">
              <CheckCircle2 size={21} />
            </div>

            <div>
              <span>Completed rides</span>
              <strong>{completedRides}</strong>
            </div>
          </article>

          <article className="rider-stat-card">
            <div className="rider-stat-icon">
              <CalendarDays size={21} />
            </div>

            <div>
              <span>Awaiting driver</span>
              <strong>{requestedRides}</strong>
            </div>
          </article>
        </section>

        <div className="rider-content-grid">
          <section className="booking-card">
            <div className="rider-card-heading">
              <div>
                <span className="rider-eyebrow">BOOK A RIDE</span>

                <h2>Plan your journey.</h2>

                <p>
                  Select your pickup and destination on the map.
                </p>
              </div>

              <div className="booking-heading-icon">
                <Navigation size={23} />
              </div>
            </div>

            {error && (
              <div className="rider-alert rider-alert-error">
                {error}
              </div>
            )}

            {success && (
              <div className="rider-alert rider-alert-success">
                {success}
              </div>
            )}

            <RideLocationPicker
              onRouteChange={handleRouteChange}
              resetKey={mapResetKey}
            />

            <div className="rider-selected-route">
              <div className="rider-selected-location">
                <MapPin size={17} />

                <div>
                  <strong>Selected pickup</strong>
                  <span>
                    {pickupLocation || "Not selected yet"}
                  </span>
                </div>
              </div>

              <div className="rider-selected-location">
                <Navigation size={17} />

                <div>
                  <strong>Selected destination</strong>
                  <span>
                    {dropLocation || "Not selected yet"}
                  </span>
                </div>
              </div>

              <div className="rider-selected-location">
                <Route size={17} />

                <div>
                  <strong>Driving distance</strong>
                  <span>
                    {distanceKm
                      ? `${distanceKm} km`
                      : "Waiting for route"}
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleFareEstimate}>
              <button
                type="submit"
                className="rider-estimate-button"
                disabled={
                  loadingFare ||
                  booking ||
                  !pickupLocation ||
                  !dropLocation ||
                  !distanceKm
                }
              >
                {loadingFare ? "Calculating..." : "Calculate fare"}

                {!loadingFare && <ArrowRight size={18} />}
              </button>
            </form>

            {fare && (
              <div className="fare-result">
                <div className="fare-result-heading">
                  <div>
                    <span>ESTIMATED FARE</span>

                    <strong>
                      {formatCurrency(fare.totalFare)}
                    </strong>
                  </div>

                  <Wallet size={25} />
                </div>

                <div className="fare-breakdown">
                  <div>
                    <span>Distance</span>
                    <strong>{fare.distanceKm} km</strong>
                  </div>

                  <div>
                    <span>Base fare</span>
                    <strong>
                      {formatCurrency(fare.baseFare)}
                    </strong>
                  </div>

                  <div>
                    <span>Distance fare</span>
                    <strong>
                      {formatCurrency(fare.distanceFare)}
                    </strong>
                  </div>
                </div>

                <button
                  type="button"
                  className="rider-book-button"
                  onClick={handleBookRide}
                  disabled={booking}
                >
                  {booking
                    ? "Booking your ride..."
                    : "Confirm and book ride"}

                  {!booking && <ArrowRight size={18} />}
                </button>
              </div>
            )}

            <p className="fare-disclaimer">
              Fare is an estimate based on the driving distance
              calculated from your selected map locations.
              Readable pickup and destination addresses are saved
              with your booking whenever address lookup is available.
            </p>
          </section>

          <section className="ride-history-card">
            <div className="ride-history-heading">
              <div>
                <span className="rider-eyebrow">YOUR ACTIVITY</span>

                <h2>Recent rides</h2>

                <small className="ride-auto-refresh-label">
                  Auto-refresh every 15 seconds
                </small>
              </div>

              <button
                className="ride-refresh-button"
                onClick={handleManualRefresh}
                disabled={loadingRides}
                aria-label="Refresh ride history"
                title="Refresh ride history"
              >
                <RefreshCw
                  size={17}
                  className={loadingRides ? "ride-spin" : ""}
                />
              </button>
            </div>

            {loadingRides ? (
              <div className="ride-empty-state">
                <LoaderCircle size={28} className="ride-spin" />
                <p>Loading your rides...</p>
              </div>
            ) : rides.length === 0 ? (
              <div className="ride-empty-state">
                <div className="ride-empty-icon">
                  <CarFront size={30} />
                </div>

                <h3>No rides yet</h3>
                <p>Your booked rides will appear here.</p>
              </div>
            ) : (
              <div className="ride-list">
                {rides.map((ride) => {
                  const canCancel = [
                    "REQUESTED",
                    "ACCEPTED",
                  ].includes(ride.status);

                  const isCanceling =
                    cancelingRideId === ride.rideId;

                  return (
                    <article
                      className="ride-history-item"
                      key={ride.rideId}
                    >
                      <div className="ride-history-top">
                        <span className="ride-id">
                          Ride #{ride.rideId}
                        </span>

                        <span
                          className={`ride-status ride-status-${ride.status?.toLowerCase()}`}
                        >
                          {ride.status}
                        </span>
                      </div>

                      <div className="ride-route">
                        <div className="ride-route-line">
                          <span className="route-dot pickup-dot" />
                          <span>{ride.pickupLocation}</span>
                        </div>

                        <div className="ride-route-line">
                          <span className="route-dot drop-dot" />
                          <span>{ride.dropLocation}</span>
                        </div>
                      </div>

                      <div className="ride-history-bottom">
                        <span>{formatDate(ride.createdAt)}</span>

                        <strong>
                          {formatCurrency(ride.fare)}
                        </strong>
                      </div>

                      <div className="ride-driver-name">
                        <UserRound size={15} />

                        <span>
                          Driver: {ride.driverName || "Not assigned"}
                        </span>
                      </div>

                      <RideProgress status={ride.status} />

                      {canCancel && (
                        <button
                          type="button"
                          className="ride-cancel-button"
                          onClick={() => handleCancelRide(ride)}
                          disabled={cancelingRideId !== null}
                        >
                          {isCanceling ? (
                            <>
                              <LoaderCircle
                                size={16}
                                className="ride-spin"
                              />
                              Cancelling...
                            </>
                          ) : (
                            <>
                              <XCircle size={16} />
                              Cancel ride
                            </>
                          )}
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

export default RiderDashboard;

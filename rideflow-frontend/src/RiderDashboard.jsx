import { useCallback, useEffect, useState } from "react";
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
} from "lucide-react";

const RIDE_API = "http://localhost:8080/api/rides";
const FARE_API = "http://localhost:8080/api/fares";

function formatDate(date) {
  if (!date) return "Date unavailable";

  return new Date(date).toLocaleString("en-IN", {
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

function RiderDashboard({ user, onLogout }) {
  const [rides, setRides] = useState([]);
  const [loadingRides, setLoadingRides] = useState(true);
  const [pickupLocation, setPickupLocation] = useState("");
  const [dropLocation, setDropLocation] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [fare, setFare] = useState(null);
  const [loadingFare, setLoadingFare] = useState(false);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchRides = useCallback(async () => {
    if (!user?.userId) return;

    setLoadingRides(true);

    try {
      const response = await axios.get(
        `${RIDE_API}/rider/${user.userId}`
      );

      setRides(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load your ride history."
      );
    } finally {
      setLoadingRides(false);
    }
  }, [user?.userId]);

  useEffect(() => {
    fetchRides();
  }, [fetchRides]);

  const handleFareEstimate = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setFare(null);

    const distance = Number(distanceKm);

    if (!pickupLocation.trim() || !dropLocation.trim()) {
      setError("Please enter both pickup and destination locations.");
      return;
    }

    if (
      !Number.isFinite(distance) ||
      distance <= 0
    ) {
      setError("Please enter a valid distance greater than zero.");
      return;
    }

    if (pickupLocation.trim().toLowerCase() === dropLocation.trim().toLowerCase()) {
      setError("Pickup and destination cannot be the same.");
      return;
    }

    setLoadingFare(true);

    try {
      const response = await axios.post(`${FARE_API}/calculate`, {
        distanceKm: distance,
      });

      setFare(response.data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to calculate fare. Please check the backend."
      );
    } finally {
      setLoadingFare(false);
    }
  };

  const handleBookRide = async () => {
    if (!fare) {
      setError("Please calculate the fare before booking.");
      return;
    }

    setBooking(true);
    setError("");
    setSuccess("");

    try {
      const response = await axios.post(`${RIDE_API}/book`, {
        riderId: user.userId,
        pickupLocation: pickupLocation.trim(),
        dropLocation: dropLocation.trim(),
        distanceKm: Number(distanceKm),
      });

      setSuccess(
        response.data.message || "Your ride has been booked successfully!"
      );

      setPickupLocation("");
      setDropLocation("");
      setDistanceKm("");
      setFare(null);

      await fetchRides();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to book your ride. Please try again."
      );
    } finally {
      setBooking(false);
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
              {user.name?.charAt(0)?.toUpperCase() || "R"}
            </div>
            <div>
              <strong>{user.name}</strong>
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
            <h1>Hello, {user.name?.split(" ")[0] || "there"}!</h1>
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
                <p>Enter your trip details to see the estimated fare.</p>
              </div>
              <div className="booking-heading-icon">
                <Navigation size={23} />
              </div>
            </div>

            {error && <div className="rider-alert rider-alert-error">{error}</div>}
            {success && (
              <div className="rider-alert rider-alert-success">
                {success}
              </div>
            )}

            <form onSubmit={handleFareEstimate}>
              <label htmlFor="pickupLocation">Pickup location</label>
              <div className="rider-location-input">
                <MapPin size={19} />
                <input
                  id="pickupLocation"
                  type="text"
                  placeholder="Enter your pickup location"
                  value={pickupLocation}
                  onChange={(event) => {
                    setPickupLocation(event.target.value);
                    setFare(null);
                  }}
                  required
                />
              </div>

              <label htmlFor="dropLocation">Destination</label>
              <div className="rider-location-input">
                <Navigation size={19} />
                <input
                  id="dropLocation"
                  type="text"
                  placeholder="Where are you going?"
                  value={dropLocation}
                  onChange={(event) => {
                    setDropLocation(event.target.value);
                    setFare(null);
                  }}
                  required
                />
              </div>

              <label htmlFor="distanceKm">Trip distance (km)</label>
              <div className="rider-location-input">
                <Route size={19} />
                <input
                  id="distanceKm"
                  type="number"
                  min="0.1"
                  step="0.1"
                  placeholder="Enter estimated distance"
                  value={distanceKm}
                  onChange={(event) => {
                    setDistanceKm(event.target.value);
                    setFare(null);
                  }}
                  required
                />
              </div>

              <button
                type="submit"
                className="rider-estimate-button"
                disabled={loadingFare || booking}
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
                    <strong>{formatCurrency(fare.totalFare)}</strong>
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
                    <strong>{formatCurrency(fare.baseFare)}</strong>
                  </div>
                  <div>
                    <span>Distance fare</span>
                    <strong>{formatCurrency(fare.distanceFare)}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  className="rider-book-button"
                  onClick={handleBookRide}
                  disabled={booking}
                >
                  {booking ? "Booking your ride..." : "Confirm and book ride"}
                  {!booking && <ArrowRight size={18} />}
                </button>
              </div>
            )}

            <p className="fare-disclaimer">
              Fare is an estimate based on the distance you enter.
            </p>
          </section>

          <section className="ride-history-card">
            <div className="ride-history-heading">
              <div>
                <span className="rider-eyebrow">YOUR ACTIVITY</span>
                <h2>Recent rides</h2>
              </div>

              <button
                className="ride-refresh-button"
                onClick={fetchRides}
                disabled={loadingRides}
                aria-label="Refresh ride history"
              >
                <RefreshCw size={17} />
              </button>
            </div>

            {loadingRides ? (
              <div className="ride-empty-state">
                Loading your rides...
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
                {rides.map((ride) => (
                  <article className="ride-history-item" key={ride.rideId}>
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
                        <span className="route-dot pickup-dot"></span>
                        <span>{ride.pickupLocation}</span>
                      </div>
                      <div className="ride-route-line">
                        <span className="route-dot drop-dot"></span>
                        <span>{ride.dropLocation}</span>
                      </div>
                    </div>

                    <div className="ride-history-bottom">
                      <span>{formatDate(ride.createdAt)}</span>
                      <strong>{formatCurrency(ride.fare)}</strong>
                    </div>

                    <div className="ride-driver-name">
                      Driver: {ride.driverName || "Not assigned"}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

export default RiderDashboard;
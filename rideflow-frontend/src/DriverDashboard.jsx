
import { useCallback, useEffect, useRef, useState } from "react";
import api from "./api/axiosInstance";
import DriverLocationSharing from "./components/DriverLocationSharing";
import {
  CarFront,
  MapPin,
  Navigation,
  Wallet,
  Clock3,
  RefreshCw,
  LogOut,
  CheckCircle2,
  Route,
  Play,
  Flag,
  AlertCircle,
  LoaderCircle,
  Power,
} from "lucide-react";

const RIDE_API = "/rides";
const DRIVER_API = "/drivers";
const REFRESH_INTERVAL = 15000;

function getErrorMessage(error) {
  return (
    error.response?.data?.message ||
    error.response?.data?.error ||
    error.message ||
    "Something went wrong. Please try again."
  );
}

function extractRides(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.rides)) return data.rides;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
}

function formatDate(dateValue) {
  if (!dateValue) return "Just now";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return "Recently";

  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatCard({ icon: Icon, label, value, detail }) {
  return (
    <div className="driver-stat-card">
      <div className="driver-stat-icon">
        <Icon size={21} />
      </div>
      <div>
        <p className="driver-stat-label">{label}</p>
        <h3>{value}</h3>
        <span>{detail}</span>
      </div>
    </div>
  );
}

function RideCard({ ride, type, loading, onAccept, onUpdateStatus }) {
  const rideId = ride.rideId ?? ride.id;
  const pickup = ride.pickupLocation || "Pickup location unavailable";
  const drop = ride.dropLocation || "Drop location unavailable";
  const fare = ride.fare ?? ride.totalFare ?? 0;
  const status = ride.status || "REQUESTED";
  const riderName =
    ride.riderName || ride.rider?.name || "RideFlow Rider";

  return (
    <article className="driver-ride-card">
      <div className="driver-ride-top">
        <div>
          <span className={`driver-status status-${status.toLowerCase()}`}>
            {status.replaceAll("_", " ")}
          </span>
          <p className="driver-ride-date">{formatDate(ride.createdAt)}</p>
        </div>

        <div className="driver-ride-fare">
          <span>Estimated fare</span>
          <strong>{formatCurrency(fare)}</strong>
        </div>
      </div>

      <div className="driver-route">
        <div className="driver-route-point">
          <span className="driver-route-dot pickup-dot" />
          <div>
            <small>Pickup location</small>
            <p>{pickup}</p>
          </div>
        </div>

        <div className="driver-route-line" />

        <div className="driver-route-point">
          <span className="driver-route-dot drop-dot" />
          <div>
            <small>Drop location</small>
            <p>{drop}</p>
          </div>
        </div>
      </div>

      <div className="driver-ride-bottom">
        <div className="driver-rider-info">
          <div className="driver-rider-avatar">
            {riderName.charAt(0).toUpperCase()}
          </div>
          <div>
            <small>Rider</small>
            <strong>{riderName}</strong>
          </div>
        </div>

        {type === "available" && (
          <button
            className="driver-action-btn"
            onClick={() => onAccept(rideId)}
            disabled={loading || !rideId}
          >
            <CheckCircle2 size={17} />
            Accept Ride
          </button>
        )}

        {type === "accepted" && (
          <button
            className="driver-action-btn"
            onClick={() => onUpdateStatus(rideId, "ONGOING")}
            disabled={loading || !rideId}
          >
            <Play size={17} />
            Start Ride
          </button>
        )}

        {type === "ongoing" && (
          <button
            className="driver-action-btn complete-btn"
            onClick={() => onUpdateStatus(rideId, "COMPLETED")}
            disabled={loading || !rideId}
          >
            <Flag size={17} />
            Complete Ride
          </button>
        )}
      </div>
    </article>
  );
}

export default function DriverDashboard({ user, onLogout }) {
  const [availableRides, setAvailableRides] = useState([]);
  const [myRides, setMyRides] = useState([]);

  const [dashboardStats, setDashboardStats] = useState({
    totalRides: 0,
    completedRides: 0,
    activeRides: 0,
    totalEarnings: 0,
  });

  const [workStatus, setWorkStatus] = useState("OFFLINE");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState("available");

  const isFetchingRef = useRef(false);
  const driverId = user?.userId;

  const fetchDashboardData = useCallback(
    async ({ silent = false } = {}) => {
      if (!driverId) {
        setError(
          "Driver account information is missing. Please log in again."
        );
        setLoading(false);
        setAvailabilityLoading(false);
        return;
      }

      if (isFetchingRef.current) return;

      isFetchingRef.current = true;

      if (!silent) {
        setLoading(true);
        setError("");
      }

      try {
        const [
          availableResponse,
          myRidesResponse,
          dashboardResponse,
        ] = await Promise.all([
          api.get(`${RIDE_API}/available/${driverId}`),
          api.get(`${RIDE_API}/driver/${driverId}`),
          api.get(`${DRIVER_API}/${driverId}/dashboard`),
        ]);

        setAvailableRides(extractRides(availableResponse.data));
        setMyRides(extractRides(myRidesResponse.data));

        const stats = dashboardResponse.data || {};

        setDashboardStats({
          totalRides: Number(stats.totalRides) || 0,
          completedRides: Number(stats.completedRides) || 0,
          activeRides: Number(stats.activeRides) || 0,
          totalEarnings: Number(stats.totalEarnings) || 0,
        });

        const online =
          stats.availability === "ONLINE" ||
          stats.availability === true;

        setIsOnline(online);

        const backendWorkStatus = stats.workStatus;

        setWorkStatus(
          ["AVAILABLE", "BUSY", "OFFLINE"].includes(backendWorkStatus)
            ? backendWorkStatus
            : !online
              ? "OFFLINE"
              : Number(stats.activeRides) > 0
                ? "BUSY"
                : "AVAILABLE"
        );

        setError("");
      } catch (requestError) {
        setError(getErrorMessage(requestError));
      } finally {
        isFetchingRef.current = false;

        if (!silent) {
          setLoading(false);
          setAvailabilityLoading(false);
        }
      }
    },
    [driverId]
  );

  useEffect(() => {
    fetchDashboardData();

    const intervalId = window.setInterval(() => {
      fetchDashboardData({ silent: true });
    }, REFRESH_INTERVAL);

    return () => window.clearInterval(intervalId);
  }, [fetchDashboardData]);

  const handleAvailabilityToggle = async () => {
    if (!driverId || availabilityLoading || actionLoading) return;

    if (isOnline && workStatus === "BUSY") {
      setError("Complete or cancel your active ride before going offline.");
      return;
    }

    const nextAvailability = !isOnline;

    setAvailabilityLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.put(
        `${DRIVER_API}/${driverId}/availability`,
        { available: nextAvailability }
      );

      setIsOnline(Boolean(response.data?.available));
      setWorkStatus(
        response.data?.workStatus ||
          (nextAvailability ? "AVAILABLE" : "OFFLINE")
      );

      setSuccess(
        nextAvailability
          ? "You're online and ready to receive ride requests!"
          : "You're offline. You won't receive new ride requests."
      );

      if (nextAvailability) {
        setActiveTab("available");
      }

      await fetchDashboardData();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      await fetchDashboardData({ silent: true });
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const handleAcceptRide = async (rideId) => {
    if (!rideId) return;

    if (!isOnline) {
      setError("Go online before accepting a ride.");
      return;
    }

    if (workStatus === "BUSY") {
      setError("You already have an active ride. Complete it first.");
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      await api.put(`${RIDE_API}/${rideId}/accept/${driverId}`);

      setSuccess("Ride accepted successfully!");
      setActiveTab("accepted");

      await fetchDashboardData();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      await fetchDashboardData({ silent: true });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async (rideId, status) => {
    if (!rideId) return;

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      await api.put(`${RIDE_API}/${rideId}/status/${driverId}`, {
        status,
      });

      setSuccess(
        status === "ONGOING"
          ? "Ride started successfully!"
          : "Ride completed successfully!"
      );

      await fetchDashboardData();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setActionLoading(false);
    }
  };

  const acceptedRides = myRides.filter(
    (ride) => ride.status === "ACCEPTED"
  );

  const ongoingRides = myRides.filter(
    (ride) => ride.status === "ONGOING"
  );

  const completedRides = myRides.filter(
    (ride) => ride.status === "COMPLETED"
  );

  // One GPS watcher for the driver's active rides.
  const trackingRide = acceptedRides[0] || ongoingRides[0];

  const displayedRides =
    activeTab === "available"
      ? workStatus === "AVAILABLE"
        ? availableRides
        : []
      : activeTab === "accepted"
        ? acceptedRides
        : activeTab === "ongoing"
          ? ongoingRides
          : completedRides;

  const tabTitle = {
    available: "Available ride requests",
    accepted: "Accepted rides",
    ongoing: "Ongoing rides",
    completed: "Completed rides",
  };

  return (
    <div className="driver-dashboard">
      <header className="driver-header">
        <a href="/" className="driver-brand">
          <span className="driver-brand-icon">
            <CarFront size={23} />
          </span>
          <span>
            Ride<span>Flow</span>
          </span>
        </a>

        <div className="driver-header-right">
          <div className="driver-profile">
            <div className="driver-profile-avatar">
              {(user?.name || "D").charAt(0).toUpperCase()}
            </div>
            <div>
              <strong>{user?.name || "Driver"}</strong>
              <small>Driver account</small>
            </div>
          </div>

          <button
            className="driver-logout-btn"
            onClick={onLogout}
            title="Logout"
          >
            <LogOut size={17} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      <main className="driver-main">
        <section className="driver-welcome">
          <div>
            <span className="driver-eyebrow">DRIVER WORKSPACE</span>
            <h1>
              Welcome back, {user?.name?.split(" ")[0] || "Driver"}!
            </h1>
            <p>Manage your rides and track your driving activity.</p>

            <div
              className={`driver-availability ${
                workStatus === "AVAILABLE"
                  ? "is-online"
                  : workStatus === "BUSY"
                    ? "is-busy"
                    : "is-offline"
              }`}
            >
              <span className="driver-availability-dot" />
              <span>
                {workStatus === "AVAILABLE"
                  ? "You're Available"
                  : workStatus === "BUSY"
                    ? "You're Busy — Active Ride"
                    : "You're Offline"}
              </span>
            </div>
          </div>

          <div className="driver-welcome-actions">
            <button
              className={`driver-availability-btn ${
                isOnline ? "online" : "offline"
              }`}
              onClick={handleAvailabilityToggle}
              disabled={
                availabilityLoading ||
                loading ||
                actionLoading ||
                (isOnline && workStatus === "BUSY")
              }
              title={
                workStatus === "BUSY"
                  ? "Complete or cancel your active ride before going offline"
                  : ""
              }
            >
              {availabilityLoading ? (
                <LoaderCircle size={17} className="driver-spin" />
              ) : (
                <Power size={17} />
              )}

              {availabilityLoading
                ? "Updating..."
                : workStatus === "BUSY"
                  ? "Busy on Active Ride"
                  : isOnline
                    ? "Go Offline"
                    : "Go Online"}
            </button>

            <button
              className="driver-refresh-btn"
              onClick={fetchDashboardData}
              disabled={loading || actionLoading || availabilityLoading}
            >
              <RefreshCw
                size={17}
                className={loading ? "driver-spin" : ""}
              />
              Refresh
            </button>
          </div>
        </section>

        {error && (
          <div className="driver-alert driver-alert-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="driver-alert driver-alert-success">
            <CheckCircle2 size={18} />
            <span>{success}</span>
            <button onClick={() => setSuccess("")}>×</button>
          </div>
        )}

        <section className="driver-stats-grid">
          <StatCard
            icon={Route}
            label="Total rides"
            value={dashboardStats.totalRides}
            detail="Your assigned rides"
          />

          <StatCard
            icon={CheckCircle2}
            label="Completed rides"
            value={dashboardStats.completedRides}
            detail="Successfully completed"
          />

          <StatCard
            icon={Clock3}
            label="Active rides"
            value={dashboardStats.activeRides}
            detail="Accepted and ongoing"
          />

          <StatCard
            icon={Wallet}
            label="Total earnings"
            value={formatCurrency(dashboardStats.totalEarnings)}
            detail="From completed rides"
          />
        </section>

        {trackingRide && (
          <DriverLocationSharing
            rideId={trackingRide.rideId ?? trackingRide.id}
            driverId={driverId}
            isOnline={isOnline}
            rideStatus={trackingRide.status}
          />
        )}

        <section className="driver-workspace">
          <div className="driver-section-heading">
            <div>
              <span className="driver-eyebrow">RIDE MANAGEMENT</span>
              <h2>Your rides</h2>
            </div>

            <span className="driver-live-label">
              <span />
              Auto-refresh every 15 seconds
            </span>
          </div>

          <div className="driver-tabs">
            <button
              className={activeTab === "available" ? "active" : ""}
              onClick={() => setActiveTab("available")}
            >
              Available
              <span>
                {workStatus === "AVAILABLE" ? availableRides.length : 0}
              </span>
            </button>

            <button
              className={activeTab === "accepted" ? "active" : ""}
              onClick={() => setActiveTab("accepted")}
            >
              Accepted
              <span>{acceptedRides.length}</span>
            </button>

            <button
              className={activeTab === "ongoing" ? "active" : ""}
              onClick={() => setActiveTab("ongoing")}
            >
              Ongoing
              <span>{ongoingRides.length}</span>
            </button>

            <button
              className={activeTab === "completed" ? "active" : ""}
              onClick={() => setActiveTab("completed")}
            >
              Completed
              <span>{completedRides.length}</span>
            </button>
          </div>

          <div className="driver-rides-heading">
            <h3>{tabTitle[activeTab]}</h3>
            <span>
              {displayedRides.length}{" "}
              {displayedRides.length === 1 ? "ride" : "rides"}
            </span>
          </div>

          {loading ? (
            <div className="driver-empty-state">
              <LoaderCircle className="driver-spin" size={32} />
              <h3>Loading your rides...</h3>
              <p>Please wait while we fetch the latest information.</p>
            </div>
          ) : activeTab === "available" && workStatus === "OFFLINE" ? (
            <div className="driver-empty-state">
              <div className="driver-empty-icon">
                <Power size={27} />
              </div>
              <h3>You're currently offline</h3>
              <p>Go online to view and accept new ride requests.</p>

              <button
                className="driver-empty-refresh"
                onClick={handleAvailabilityToggle}
                disabled={availabilityLoading}
              >
                <Power size={16} />
                Go Online
              </button>
            </div>
          ) : activeTab === "available" && workStatus === "BUSY" ? (
            <div className="driver-empty-state">
              <div className="driver-empty-icon">
                <Clock3 size={27} />
              </div>
              <h3>You're handling an active ride</h3>
              <p>
                Complete or cancel your current active ride before accepting
                another request.
              </p>
              <button
                className="driver-empty-refresh"
                onClick={() =>
                  setActiveTab(
                    ongoingRides.length > 0 ? "ongoing" : "accepted"
                  )
                }
              >
                View active ride
              </button>
            </div>
          ) : displayedRides.length === 0 ? (
            <div className="driver-empty-state">
              <div className="driver-empty-icon">
                {activeTab === "available" ? (
                  <Navigation size={27} />
                ) : (
                  <MapPin size={27} />
                )}
              </div>

              <h3>
                {activeTab === "available"
                  ? "No ride requests available"
                  : `No ${activeTab} rides yet`}
              </h3>

              <p>
                {activeTab === "available"
                  ? "New ride requests will appear here when available."
                  : "Your rides will appear here as you accept and complete them."}
              </p>

              <button
                className="driver-empty-refresh"
                onClick={fetchDashboardData}
              >
                <RefreshCw size={16} />
                Check again
              </button>
            </div>
          ) : (
            <div className="driver-rides-list">
              {displayedRides.map((ride) => (
                <RideCard
                  key={ride.rideId ?? ride.id}
                  ride={ride}
                  type={activeTab}
                  loading={actionLoading}
                  onAccept={handleAcceptRide}
                  onUpdateStatus={handleUpdateStatus}
                />
              ))}
            </div>
          )}
        </section>

        <footer className="driver-footer">
          <span>© {new Date().getFullYear()} RideFlow</span>
          <span>Drive safely. Ride smoothly.</span>
        </footer>
      </main>
    </div>
  );
}

import { useState } from "react";
import axios from "axios";
import {
  ArrowRight,
  CarFront,
  Lock,
  LogOut,
  Mail,
  Menu,
  ShieldCheck,
  User,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import RiderDashboard from "./RiderDashboard";
import "./App.css";

const USER_API = "http://localhost:8080/api/users";
const STORAGE_KEY = "rideflowUser";

function loadStoredUser() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed && parsed.userId ? parsed : null;
  } catch {
    return null;
  }
}

function getErrorMessage(err, fallback) {
  const data = err.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  if (data?.message) return data.message;
  if (!err.response) {
    return "Unable to reach the server. Please check that the backend is running.";
  }
  return fallback;
}

function CarIllustration() {
  return (
    <svg
      className="hero-car"
      viewBox="0 0 520 300"
      role="img"
      aria-label="RideFlow car illustration"
    >
      <ellipse className="car-shadow" cx="260" cy="262" rx="215" ry="16" />
      <path
        className="car-body"
        d="M60 200 C60 176 76 166 98 162 L142 110 C154 94 170 86 190 86 L326 86 C348 86 364 94 378 110 L416 160 C450 164 466 178 466 202 L466 224 C466 232 460 238 452 238 L74 238 C66 238 60 232 60 224 Z"
      />
      <path
        className="car-window"
        d="M160 156 L192 112 C196 106 202 104 208 104 L250 104 L250 156 Z"
      />
      <path
        className="car-window"
        d="M268 104 L322 104 C330 104 336 107 341 113 L372 156 L268 156 Z"
      />
      <rect className="car-stripe" x="70" y="186" width="386" height="8" rx="4" />
      <rect className="car-light" x="440" y="176" width="26" height="14" rx="6" />
      <rect className="car-taillight" x="60" y="178" width="18" height="14" rx="6" />
      <g>
        <circle className="car-wheel" cx="148" cy="238" r="38" />
        <circle className="car-hub" cx="148" cy="238" r="16" />
        <circle className="car-wheel" cx="384" cy="238" r="38" />
        <circle className="car-hub" cx="384" cy="238" r="16" />
      </g>
      <g className="car-pin">
        <circle cx="420" cy="52" r="26" />
        <circle className="car-pin-dot" cx="420" cy="52" r="9" />
      </g>
      <path className="car-route" d="M60 270 C140 290 300 292 380 276" />
    </svg>
  );
}

function Navbar({ onNavigate, onLogin, onRegister }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const go = (id) => {
    setMenuOpen(false);
    onNavigate(id);
  };

  return (
    <header className="rf-nav">
      <div className="rf-container rf-nav-inner">
        <button
          type="button"
          className="rf-brand"
          onClick={() => go("home")}
          aria-label="RideFlow home"
        >
          <span className="rf-brand-icon">
            <CarFront size={22} />
          </span>
          <span className="rf-brand-text">
            ride<span>flow</span>
          </span>
        </button>

        <nav className={`rf-nav-links ${menuOpen ? "open" : ""}`}>
          <button type="button" onClick={() => go("home")}>
            Home
          </button>
          <button type="button" onClick={() => go("features")}>
            Features
          </button>
          <button type="button" onClick={() => go("about")}>
            About
          </button>
          <div className="rf-nav-actions">
            <button
              type="button"
              className="rf-btn rf-btn-ghost"
              onClick={() => {
                setMenuOpen(false);
                onLogin();
              }}
            >
              Log in
            </button>
            <button
              type="button"
              className="rf-btn rf-btn-gold"
              onClick={() => {
                setMenuOpen(false);
                onRegister();
              }}
            >
              Get started
            </button>
          </div>
        </nav>

        <button
          type="button"
          className="rf-menu-toggle"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
    </header>
  );
}

function Landing({ onNavigate, onLogin, onRegister, onBookRide, onBecomeDriver }) {
  return (
    <div className="rf-page">
      <Navbar
        onNavigate={onNavigate}
        onLogin={onLogin}
        onRegister={onRegister}
      />

      <main>
        <section id="home" className="rf-hero">
          <div className="rf-container rf-hero-grid">
            <div className="rf-hero-copy">
              <span className="rf-eyebrow">YOUR CITY, YOUR RIDE</span>
              <h1>
                Every journey begins with <em>RideFlow.</em>
              </h1>
              <p>
                Book convenient rides in minutes, see transparent fares before
                you travel, and get where you are going with a reliable driver
                you can count on.
              </p>
              <div className="rf-hero-buttons">
                <button
                  type="button"
                  className="rf-btn rf-btn-gold rf-btn-lg"
                  onClick={onBookRide}
                >
                  Book your ride
                  <ArrowRight size={18} />
                </button>
                <button
                  type="button"
                  className="rf-btn rf-btn-outline rf-btn-lg"
                  onClick={onLogin}
                >
                  Log in
                </button>
              </div>
            </div>

            <div className="rf-hero-art">
              <div className="rf-hero-art-card">
                <CarIllustration />
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="rf-section">
          <div className="rf-container">
            <div className="rf-section-heading">
              <span className="rf-eyebrow">WHY RIDEFLOW</span>
              <h2>Rides built around you.</h2>
              <p>
                Everything you need for a smooth trip, from the moment you book
                to the moment you arrive.
              </p>
            </div>

            <div className="rf-feature-grid">
              <article className="rf-feature-card">
                <div className="rf-feature-icon">
                  <Zap size={24} />
                </div>
                <h3>Quick pickups</h3>
                <p>
                  Request a ride in a few taps and get matched with a nearby
                  driver so you spend less time waiting.
                </p>
              </article>

              <article className="rf-feature-card">
                <div className="rf-feature-icon">
                  <ShieldCheck size={24} />
                </div>
                <h3>Ride with confidence</h3>
                <p>
                  Every trip is tracked from request to completion, so you
                  always know the status of your ride.
                </p>
              </article>

              <article className="rf-feature-card">
                <div className="rf-feature-icon">
                  <Wallet size={24} />
                </div>
                <h3>Transparent fares</h3>
                <p>
                  See your estimated fare with a clear breakdown before you
                  confirm. No surprises at the end of the trip.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="rf-section rf-section-tight">
          <div className="rf-container">
            <div className="rf-driver-cta">
              <div>
                <span className="rf-eyebrow rf-eyebrow-light">
                  FOR DRIVERS
                </span>
                <h2>Drive when you want. Earn on your terms.</h2>
                <p>
                  Join the RideFlow driver community, accept rides near you and
                  turn your time on the road into steady income.
                </p>
              </div>
              <button
                type="button"
                className="rf-btn rf-btn-gold rf-btn-lg"
                onClick={onBecomeDriver}
              >
                Become a driver
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </section>

        <section id="about" className="rf-section">
          <div className="rf-container rf-about">
            <div className="rf-about-copy">
              <span className="rf-eyebrow">ABOUT RIDEFLOW</span>
              <h2>Simple, honest and reliable rides.</h2>
              <p>
                RideFlow connects riders and drivers through a clean, easy to
                use platform. We believe getting around your city should feel
                effortless, with clear pricing and dependable service.
              </p>
              <p>
                Whether you are heading to work, meeting friends or catching a
                flight, RideFlow keeps every journey straightforward from start
                to finish.
              </p>
            </div>

            <div className="rf-about-stats">
              <div className="rf-about-stat">
                <strong>Fast</strong>
                <span>Book a ride in minutes</span>
              </div>
              <div className="rf-about-stat">
                <strong>Clear</strong>
                <span>Fare estimates up front</span>
              </div>
              <div className="rf-about-stat">
                <strong>Trusted</strong>
                <span>Every ride tracked</span>
              </div>
              <div className="rf-about-stat">
                <strong>Open</strong>
                <span>For riders and drivers</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="rf-footer">
        <div className="rf-container rf-footer-inner">
          <div className="rf-footer-brand">
            <span className="rf-brand-icon">
              <CarFront size={20} />
            </span>
            <span className="rf-brand-text">
              ride<span>flow</span>
            </span>
          </div>
          <div className="rf-footer-links">
            <button type="button" onClick={() => onNavigate("home")}>
              Home
            </button>
            <button type="button" onClick={() => onNavigate("features")}>
              Features
            </button>
            <button type="button" onClick={() => onNavigate("about")}>
              About
            </button>
          </div>
          <p>&copy; {new Date().getFullYear()} RideFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function AuthScreen({ mode, initialRole, onModeChange, onBack, onAuthenticated }) {
  const isRegister = mode === "register";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(initialRole);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const switchMode = (nextMode) => {
    setError("");
    onModeChange(nextMode);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (isRegister && !name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    if (isRegister && password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setSubmitting(true);

    try {
      if (isRegister) {
        const response = await axios.post(`${USER_API}/register`, {
          name: name.trim(),
          email: email.trim(),
          password,
          role,
        });

        const data = response.data || {};

        onAuthenticated({
          userId: data.userId,
          name: data.name || name.trim(),
          email: email.trim(),
          role: data.role || role,
        });
      } else {
        const response = await axios.post(`${USER_API}/login`, {
          email: email.trim(),
          password,
        });

        const data = response.data || {};

        onAuthenticated({
          userId: data.userId,
          name: data.name,
          email: data.email || email.trim(),
          role: data.role,
        });
      }
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          isRegister
            ? "Unable to create your account. Please try again."
            : "Unable to log in. Please check your email and password."
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <aside className="auth-side">
        <button type="button" className="rf-brand rf-brand-light" onClick={onBack}>
          <span className="rf-brand-icon">
            <CarFront size={22} />
          </span>
          <span className="rf-brand-text">
            ride<span>flow</span>
          </span>
        </button>

        <div className="auth-side-copy">
          <span className="rf-eyebrow rf-eyebrow-light">
            {isRegister ? "JOIN RIDEFLOW" : "WELCOME BACK"}
          </span>
          <h2>
            {isRegister
              ? "Your next journey starts here."
              : "Good to see you again."}
          </h2>
          <p>
            Convenient rides, transparent fares and reliable journeys, all in
            one place.
          </p>
        </div>

        <small>&copy; {new Date().getFullYear()} RideFlow</small>
      </aside>

      <main className="auth-main">
        <div className="auth-card">
          <button type="button" className="auth-back" onClick={onBack}>
            &larr; Back to home
          </button>

          <h1>{isRegister ? "Create your account" : "Log in to RideFlow"}</h1>
          <p className="auth-subtitle">
            {isRegister
              ? "Choose how you want to use RideFlow."
              : "Enter your details to continue."}
          </p>

          {isRegister && (
            <div className="role-selector" role="radiogroup" aria-label="Account type">
              <button
                type="button"
                role="radio"
                aria-checked={role === "RIDER"}
                className={`role-option ${role === "RIDER" ? "active" : ""}`}
                onClick={() => setRole("RIDER")}
              >
                <strong>Rider</strong>
                <span>Book rides</span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={role === "DRIVER"}
                className={`role-option ${role === "DRIVER" ? "active" : ""}`}
                onClick={() => setRole("DRIVER")}
              >
                <strong>Driver</strong>
                <span>Accept rides</span>
              </button>
            </div>
          )}

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} noValidate>
            {isRegister && (
              <>
                <label htmlFor="authName">Full name</label>
                <div className="auth-input">
                  <User size={18} />
                  <input
                    id="authName"
                    type="text"
                    placeholder="Your full name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="name"
                  />
                </div>
              </>
            )}

            <label htmlFor="authEmail">Email</label>
            <div className="auth-input">
              <Mail size={18} />
              <input
                id="authEmail"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
            </div>

            <label htmlFor="authPassword">Password</label>
            <div className="auth-input">
              <Lock size={18} />
              <input
                id="authPassword"
                type="password"
                placeholder={isRegister ? "At least 6 characters" : "Your password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={isRegister ? "new-password" : "current-password"}
              />
            </div>

            <button
              type="submit"
              className="rf-btn rf-btn-forest rf-btn-lg auth-submit"
              disabled={submitting}
            >
              {submitting
                ? isRegister
                  ? "Creating account..."
                  : "Logging in..."
                : isRegister
                ? "Create account"
                : "Log in"}
              {!submitting && <ArrowRight size={18} />}
            </button>
          </form>

          <p className="auth-switch">
            {isRegister ? "Already have an account?" : "New to RideFlow?"}{" "}
            <button
              type="button"
              onClick={() => switchMode(isRegister ? "login" : "register")}
            >
              {isRegister ? "Log in" : "Create an account"}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}

function DriverHome({ user, onLogout }) {
  return (
    <div className="driver-page">
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
              {user.name?.charAt(0)?.toUpperCase() || "D"}
            </div>
            <div>
              <strong>{user.name}</strong>
              <small>Driver account</small>
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
            <span className="rider-eyebrow">DRIVER DASHBOARD</span>
            <h1>Hello, {user.name?.split(" ")[0] || "there"}!</h1>
            <p>You are logged in as a RideFlow driver.</p>
          </div>
          <div className="rider-welcome-icon">
            <CarFront size={38} />
          </div>
        </section>

        <section className="booking-card driver-card">
          <span className="rider-eyebrow">COMING SOON</span>
          <h2>Your driver tools are on the way.</h2>
          <p>
            The driver dashboard for viewing and accepting ride requests will
            appear here. Your account is ready.
          </p>
        </section>
      </main>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(loadStoredUser);
  const [view, setView] = useState("landing");
  const [authMode, setAuthMode] = useState("login");
  const [authRole, setAuthRole] = useState("RIDER");

  const scrollToSection = (id) => {
    setView("landing");
    window.setTimeout(() => {
      const target = document.getElementById(id);
      if (id === "home" || !target) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 0);
  };

  const openAuth = (mode, role = "RIDER") => {
    setAuthMode(mode);
    setAuthRole(role);
    setView("auth");
    window.scrollTo({ top: 0 });
  };

  const handleAuthenticated = (authUser) => {
    if (!authUser?.userId) {
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser));
    } catch {
      // Storage may be unavailable; the session still works until refresh.
    }

    setUser(authUser);
    setView("landing");
    window.scrollTo({ top: 0 });
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors on logout.
    }

    setUser(null);
    setView("landing");
    window.scrollTo({ top: 0 });
  };

  if (user) {
    if (user.role === "DRIVER") {
      return <DriverHome user={user} onLogout={handleLogout} />;
    }

    return <RiderDashboard user={user} onLogout={handleLogout} />;
  }

  if (view === "auth") {
    return (
      <AuthScreen
        mode={authMode}
        initialRole={authRole}
        onModeChange={setAuthMode}
        onBack={() => scrollToSection("home")}
        onAuthenticated={handleAuthenticated}
      />
    );
  }

  return (
    <Landing
      onNavigate={scrollToSection}
      onLogin={() => openAuth("login")}
      onRegister={() => openAuth("register")}
      onBookRide={() => openAuth("login", "RIDER")}
      onBecomeDriver={() => openAuth("register", "DRIVER")}
    />
  );
}

export default App;
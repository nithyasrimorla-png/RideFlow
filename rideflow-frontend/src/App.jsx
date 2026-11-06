import { useState } from "react";
import axios from "axios";
import {
  ArrowRight,
  ArrowLeft,
  CarFront,
  MapPin,
  ShieldCheck,
  Clock3,
  WalletCards,
  Menu,
  X,
  Star,
  Navigation,
  UserRound,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react";
import "./App.css";

const API_URL = "http://localhost:8080/api/users";

function AuthScreen({ initialMode, onBack }) {
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("RIDER");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loggedInUser, setLoggedInUser] = useState(null);

  const isRegister = mode === "register";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (isRegister && !name.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }

    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      if (isRegister) {
        const response = await axios.post(`${API_URL}/register`, {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
        });

        setNotice(response.data.message || "Registration successful!");
        setMode("login");
        setPassword("");
      } else {
        const response = await axios.post(`${API_URL}/login`, {
          email: email.trim().toLowerCase(),
          password,
        });

        const user = response.data;

        localStorage.setItem(
          "rideflowUser",
          JSON.stringify({
            userId: user.userId,
            name: user.name,
            email: user.email,
            role: user.role,
          })
        );

        setLoggedInUser(user);
      }
    } catch (err) {
      const message =
        err.response?.data?.message ||
        "Unable to connect to RideFlow. Please check whether the backend is running.";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (loggedInUser) {
    return (
      <main className="auth-page">
        <section className="auth-card auth-success-card">
          <div className="auth-success-icon">
            <CheckCircle2 size={38} />
          </div>
          <span className="section-label">WELCOME TO RIDEFLOW</span>
          <h1>You're all set, {loggedInUser.name}!</h1>
          <p>
            You have successfully logged in as a{" "}
            <strong>{loggedInUser.role}</strong>.
          </p>
          <p className="auth-success-note">
            Your account details have been saved. Your {loggedInUser.role.toLowerCase()} dashboard
            will be connected in the next development milestone.
          </p>
          <button className="auth-submit-button" onClick={onBack}>
            Back to home <ArrowRight size={18} />
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <button className="auth-back-button" onClick={onBack}>
          <ArrowLeft size={17} /> Back to home
        </button>

        <div className="auth-brand">
          <span className="brand-icon">
            <CarFront size={25} />
          </span>
          <span>
            ride<span className="brand-highlight">flow</span>
          </span>
        </div>

        <span className="section-label">
          {isRegister ? "START YOUR JOURNEY" : "WELCOME BACK"}
        </span>

        <h1>{isRegister ? "Create your account." : "Good to see you again."}</h1>

        <p className="auth-description">
          {isRegister
            ? "Join RideFlow and make every journey simpler."
            : "Log in to continue your RideFlow journey."}
        </p>

        {notice && <div className="auth-notice">{notice}</div>}
        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          {isRegister && (
            <>
              <label htmlFor="name">Full name</label>
              <div className="auth-input-wrap">
                <UserRound size={19} />
                <input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </div>

              <label htmlFor="role">I want to join as</label>
              <select
                id="role"
                className="auth-role-select"
                value={role}
                onChange={(event) => setRole(event.target.value)}
              >
                <option value="RIDER">Rider — Book rides</option>
                <option value="DRIVER">Driver — Offer rides</option>
              </select>
            </>
          )}

          <label htmlFor="email">Email address</label>
          <div className="auth-input-wrap">
            <Mail size={19} />
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <label htmlFor="password">Password</label>
          <div className="auth-input-wrap">
            <LockKeyhole size={19} />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          </div>

          <button
            type="submit"
            className="auth-submit-button"
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : isRegister
                ? "Create account"
                : "Log in"}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <p className="auth-switch">
          {isRegister ? "Already have an account?" : "New to RideFlow?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(isRegister ? "login" : "register");
              setError("");
              setNotice("");
              setPassword("");
            }}
          >
            {isRegister ? "Log in" : "Create an account"}
          </button>
        </p>

        <div className="auth-security">
          <ShieldCheck size={17} />
          Your account details are handled securely.
        </div>
      </section>
    </main>
  );
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [authMode, setAuthMode] = useState(null);

  const openAuth = (mode) => {
    setAuthMode(mode);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const features = [
    {
      icon: <Clock3 />,
      title: "Quick pickups",
      description: "Book a ride in seconds and get moving without delays.",
    },
    {
      icon: <ShieldCheck />,
      title: "Ride with confidence",
      description: "A simple and secure ride-booking experience.",
    },
    {
      icon: <WalletCards />,
      title: "Transparent fares",
      description: "Know your estimated fare before confirming your ride.",
    },
  ];

  if (authMode) {
    return (
      <div className="rideflow">
        <AuthScreen
          key={authMode}
          initialMode={authMode}
          onBack={() => setAuthMode(null)}
        />
      </div>
    );
  }

  return (
    <div className="rideflow">
      <header className="navbar">
        <a href="#home" className="brand">
          <span className="brand-icon">
            <CarFront size={25} />
          </span>
          <span>
            ride<span className="brand-highlight">flow</span>
          </span>
        </a>

        <button
          className="mobile-menu"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation"
        >
          {menuOpen ? <X /> : <Menu />}
        </button>

        <nav className={menuOpen ? "nav-links open" : "nav-links"}>
          <a href="#home" onClick={() => setMenuOpen(false)}>Home</a>
          <a href="#features" onClick={() => setMenuOpen(false)}>Features</a>
          <a href="#about" onClick={() => setMenuOpen(false)}>About</a>
        </nav>

        <div className="nav-actions">
          <button
            type="button"
            className="login-link"
            onClick={() => openAuth("login")}
          >
            Log in
          </button>
          <button
            type="button"
            className="nav-button"
            onClick={() => openAuth("register")}
          >
            Get started <ArrowRight size={16} />
          </button>
        </div>
      </header>

      <main>
        <section className="hero" id="home">
          <div className="hero-content">
            <div className="eyebrow">
              <span className="status-dot"></span>
              YOUR CITY, YOUR RIDE
            </div>

            <h1>
              Every journey
              <br />
              begins with <span>RideFlow.</span>
            </h1>

            <p className="hero-description">
              Your everyday travel, made simpler. Book comfortable rides,
              connect with drivers, and reach your destination with ease.
            </p>

            <div className="hero-buttons">
              <button
                type="button"
                className="primary-button"
                onClick={() => openAuth("register")}
              >
                Book your ride <ArrowRight size={18} />
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => openAuth("register")}
              >
                Become a driver
              </button>
            </div>

            <div className="hero-trust">
              <div className="trust-icon"><ShieldCheck size={19} /></div>
              <div>
                <strong>Travel with confidence</strong>
                <span>A simpler way to get around.</span>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="visual-glow"></div>
            <div className="floating-tag tag-top">
              <span className="tag-icon">
                <Star size={16} fill="currentColor" />
              </span>
              <div>
                <strong>Easy booking</strong>
                <small>Just a few simple steps</small>
              </div>
            </div>

            <div className="car-illustration">
              <div className="car-sun"></div>
              <div className="road"></div>
              <div className="car-scene">
                <div className="car-window"></div>
                <div className="car-body"></div>
                <div className="car-wheel wheel-left"></div>
                <div className="car-wheel wheel-right"></div>
                <div className="car-light"></div>
              </div>
              <div className="scene-location location-one">
                <MapPin size={18} />
              </div>
              <div className="scene-location location-two">
                <Navigation size={17} />
              </div>
            </div>

            <div className="floating-tag tag-bottom">
              <span className="tag-icon green"><MapPin size={17} /></span>
              <div>
                <strong>Your destination</strong>
                <small>Your journey starts here</small>
              </div>
            </div>
          </div>
        </section>

        <section className="features-section" id="features">
          <div className="section-heading">
            <span className="section-label">WHY RIDEFLOW?</span>
            <h2>More than just a ride.</h2>
            <p>Everything you need for a smoother everyday journey.</p>
          </div>

          <div className="feature-grid">
            {features.map((feature) => (
              <article className="feature-card" key={feature.title}>
                <div className="feature-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="driver-section" id="driver">
          <div>
            <span className="section-label">DRIVE WITH RIDEFLOW</span>
            <h2>Your car. Your time. Your opportunity.</h2>
            <p>
              Join RideFlow as a driver and take control of your driving
              schedule. Get started with a simple registration process.
            </p>
          </div>
          <button
            type="button"
            className="driver-button"
            onClick={() => openAuth("register")}
          >
            Join as a driver <ArrowRight size={17} />
          </button>
        </section>

        <section className="about-section" id="about">
          <span className="section-label">THE RIDEFLOW EXPERIENCE</span>
          <h2>Designed around your journey.</h2>
          <p>
            From booking your ride to reaching your destination,
            RideFlow brings riders and drivers together through
            one easy-to-use platform.
          </p>
        </section>
      </main>

      <footer className="footer">
        <a href="#home" className="brand footer-brand">
          <span className="brand-icon"><CarFront size={22} /></span>
          <span>
            ride<span className="brand-highlight">flow</span>
          </span>
        </a>
        <p>Making everyday journeys simpler.</p>
        <span className="copyright">© 2026 RideFlow. All rights reserved.</span>
      </footer>
    </div>
  );
}

export default App;
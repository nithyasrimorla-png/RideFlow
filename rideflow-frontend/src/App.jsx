
import { useState } from "react";
import axios from "axios";
import RiderDashboard from "./RiderDashboard";
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

function AuthScreen({ initialMode, onBack, onLoginSuccess }) {
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("RIDER");
  const [showPassword, setShowPassword] = useState(false);
 
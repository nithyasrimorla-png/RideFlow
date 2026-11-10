
import axios from "axios";

const STORAGE_KEY = "rideflowUser";

const api = axios.create({
  baseURL: "http://localhost:8080/api",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Automatically attach the JWT to protected API requests.
api.interceptors.request.use(
  (config) => {
    try {
      const storedUser = localStorage.getItem(STORAGE_KEY);

      if (storedUser) {
        const user = JSON.parse(storedUser);

        if (user?.token) {
          config.headers.Authorization = `Bearer ${user.token}`;
        }
      }
    } catch (error) {
      console.error("Unable to read RideFlow session:", error);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Clear an expired or invalid session when a protected API returns 401.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      try {
        const storedUser = localStorage.getItem(STORAGE_KEY);
        const user = storedUser ? JSON.parse(storedUser) : null;

        if (user?.token) {
          localStorage.removeItem(STORAGE_KEY);
          window.dispatchEvent(new Event("rideflow:unauthorized"));
        }
      } catch (storageError) {
        console.error("Unable to clear RideFlow session:", storageError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

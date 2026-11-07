
import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./RideLocationPicker.css";

const DEFAULT_CENTER = [13.0827, 80.2707]; // Chennai demo map

const pickupIcon = L.divIcon({
  className: "ride-map-marker",
  html: '<div class="ride-map-pin pickup-pin">P</div>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

const dropIcon = L.divIcon({
  className: "ride-map-marker",
  html: '<div class="ride-map-pin drop-pin">D</div>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(event) {
      onMapClick([
        event.latlng.lat,
        event.latlng.lng,
      ]);
    },
  });

  return null;
}

function RideLocationPicker({ onRouteChange }) {
  const [pickup, setPickup] = useState(null);
  const [destination, setDestination] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [distanceKm, setDistanceKm] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [routeError, setRouteError] = useState("");

  const handleMapClick = (coordinates) => {
    setRouteError("");

    if (!pickup || (pickup && destination)) {
      setPickup(coordinates);
      setDestination(null);
      setRouteCoordinates([]);
      setDistanceKm(null);

      onRouteChange?.(null);
      return;
    }

    setDestination(coordinates);
  };

  const clearLocations = () => {
    setPickup(null);
    setDestination(null);
    setRouteCoordinates([]);
    setDistanceKm(null);
    setRouteError("");

    onRouteChange?.(null);
  };

  useEffect(() => {
    if (!pickup || !destination) return;

    const controller = new AbortController();

    const getRoute = async () => {
      setLoadingRoute(true);
      setRouteError("");
      setDistanceKm(null);
      setRouteCoordinates([]);
      onRouteChange?.(null);

      try {
        const [pickupLat, pickupLng] = pickup;
        const [destinationLat, destinationLng] = destination;

        const url =
          `https://router.project-osrm.org/route/v1/driving/` +
          `${pickupLng},${pickupLat};${destinationLng},${destinationLat}` +
          `?overview=full&geometries=geojson`;

        const response = await fetch(url, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Unable to calculate the route.");
        }

        const data = await response.json();

        if (data.code !== "Ok" || !data.routes?.length) {
          throw new Error("No driving route found between these locations.");
        }

        const route = data.routes[0];
        const calculatedDistance = Number(
          (route.distance / 1000).toFixed(2)
        );

        const coordinates = route.geometry.coordinates.map(
          ([longitude, latitude]) => [latitude, longitude]
        );

        setRouteCoordinates(coordinates);
        setDistanceKm(calculatedDistance);

        onRouteChange?.({
          pickup,
          destination,
          distanceKm: calculatedDistance,
        });
      } catch (error) {
        if (error.name !== "AbortError") {
          setRouteError(
            error.message || "Could not calculate the route."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingRoute(false);
        }
      }
    };

    getRoute();

    return () => controller.abort();
  }, [pickup, destination, onRouteChange]);

  return (
    <section className="ride-location-picker">
      <div className="ride-map-heading">
        <div>
          <span className="rider-eyebrow">MAP BOOKING</span>
          <h3>Select your journey</h3>
          <p>Click once for pickup and again for destination.</p>
        </div>

        <button
          type="button"
          className="ride-map-clear"
          onClick={clearLocations}
          disabled={!pickup && !destination}
        >
          Clear locations
        </button>
      </div>

      <div className="ride-map-container">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={11}
          scrollWheelZoom={true}
          className="ride-leaflet-map"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapClickHandler onMapClick={handleMapClick} />

          {pickup && (
            <Marker position={pickup} icon={pickupIcon} />
          )}

          {destination && (
            <Marker position={destination} icon={dropIcon} />
          )}

          {routeCoordinates.length > 0 && (
            <Polyline
              positions={routeCoordinates}
              pathOptions={{
                color: "#32877D",
                weight: 5,
                opacity: 0.85,
              }}
            />
          )}
        </MapContainer>
      </div>

      <div className="ride-map-details">
        <div className="ride-map-location">
          <span className="ride-map-dot pickup-dot" />
          <div>
            <strong>Pickup location</strong>
            <small>
              {pickup
                ? `${pickup[0].toFixed(5)}, ${pickup[1].toFixed(5)}`
                : "Click on the map to select pickup"}
            </small>
          </div>
        </div>

        <div className="ride-map-location">
          <span className="ride-map-dot drop-dot" />
          <div>
            <strong>Destination</strong>
            <small>
              {destination
                ? `${destination[0].toFixed(5)}, ${destination[1].toFixed(5)}`
                : "Click again to select destination"}
            </small>
          </div>
        </div>
      </div>

      {loadingRoute && (
        <p className="ride-map-message">
          Calculating driving distance...
        </p>
      )}

      {routeError && (
        <p className="ride-map-error">{routeError}</p>
      )}

      {distanceKm !== null && (
        <div className="ride-map-distance">
          <span>Estimated road distance</span>
          <strong>{distanceKm} km</strong>
        </div>
      )}

      <p className="ride-map-disclaimer">
        Map data © OpenStreetMap contributors. Route estimates provided
        by OSRM and may vary from actual travel.
      </p>
    </section>
  );
}

export default RideLocationPicker;

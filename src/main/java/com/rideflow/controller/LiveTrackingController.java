package com.rideflow.controller;

import com.rideflow.entity.DriverLocation;
import com.rideflow.entity.Ride;
import com.rideflow.entity.User;
import com.rideflow.repository.DriverLocationRepository;
import com.rideflow.repository.RideRepository;
import com.rideflow.repository.UserRepository;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/tracking")
@CrossOrigin(origins = "*")
public class LiveTrackingController {

    private final DriverLocationRepository locationRepository;
    private final RideRepository rideRepository;
    private final UserRepository userRepository;

    public LiveTrackingController(
            DriverLocationRepository locationRepository,
            RideRepository rideRepository,
            UserRepository userRepository) {

        this.locationRepository = locationRepository;
        this.rideRepository = rideRepository;
        this.userRepository = userRepository;
    }

    @PostMapping("/rides/{rideId}/drivers/{driverId}/location")
    public ResponseEntity<?> updateDriverLocation(
            @PathVariable Long rideId,
            @PathVariable Long driverId,
            @RequestBody Map<String, Object> request) {

        Object latitudeValue = request.get("latitude");
        Object longitudeValue = request.get("longitude");

        if (!(latitudeValue instanceof Number)
                || !(longitudeValue instanceof Number)) {

            return ResponseEntity.badRequest()
                    .body(Map.of("message",
                            "Latitude and longitude are required"));
        }

        double latitude = ((Number) latitudeValue).doubleValue();
        double longitude = ((Number) longitudeValue).doubleValue();

        if (!Double.isFinite(latitude)
                || !Double.isFinite(longitude)
                || latitude < -90 || latitude > 90
                || longitude < -180 || longitude > 180) {

            return ResponseEntity.badRequest()
                    .body(Map.of("message",
                            "Invalid GPS coordinates"));
        }

        User driver = userRepository.findById(driverId)
                .orElse(null);

        if (driver == null || driver.getRole() != User.Role.DRIVER) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Driver not found"));
        }

        if (!driver.isAvailable()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message",
                            "Go online to share your location"));
        }

        Ride ride = rideRepository.findById(rideId)
                .orElse(null);

        if (ride == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Ride not found"));
        }

        if (ride.getDriver() == null
                || !ride.getDriver().getId().equals(driverId)) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message",
                            "This ride is not assigned to you"));
        }

        if (ride.getStatus() != Ride.RideStatus.ACCEPTED
                && ride.getStatus() != Ride.RideStatus.ONGOING) {

            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message",
                            "Location sharing is unavailable for this ride"));
        }

        DriverLocation location = locationRepository
                .findByDriverId(driverId)
                .orElseGet(DriverLocation::new);

        location.setDriver(driver);
        location.setLatitude(latitude);
        location.setLongitude(longitude);

        DriverLocation savedLocation =
                locationRepository.save(location);

        return ResponseEntity.ok(Map.of(
                "message", "Driver location updated successfully",
                "rideId", rideId,
                "driverId", driverId,
                "latitude", savedLocation.getLatitude(),
                "longitude", savedLocation.getLongitude(),
                "updatedAt", savedLocation.getUpdatedAt().toString()
        ));
    }

    @GetMapping("/rides/{rideId}/riders/{riderId}/driver-location")
    public ResponseEntity<?> getDriverLocation(
            @PathVariable Long rideId,
            @PathVariable Long riderId) {

        Ride ride = rideRepository.findById(rideId)
                .orElse(null);

        if (ride == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Ride not found"));
        }

        if (ride.getRider() == null
                || !ride.getRider().getId().equals(riderId)) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message",
                            "You are not authorized to track this ride"));
        }

        if (ride.getStatus() != Ride.RideStatus.ACCEPTED
                && ride.getStatus() != Ride.RideStatus.ONGOING) {

            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message",
                            "Live tracking is unavailable for this ride"));
        }

        if (ride.getDriver() == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message",
                            "No driver assigned to this ride"));
        }

        Long driverId = ride.getDriver().getId();

        DriverLocation location = locationRepository
                .findByDriverId(driverId)
                .orElse(null);

        if (location == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message",
                            "Driver location is not available yet"));
        }

        return ResponseEntity.ok(Map.of(
                "rideId", rideId,
                "driverId", driverId,
                "driverName", ride.getDriver().getName(),
                "latitude", location.getLatitude(),
                "longitude", location.getLongitude(),
                "updatedAt", location.getUpdatedAt().toString(),
                "rideStatus", ride.getStatus().toString()
        ));
    }
}
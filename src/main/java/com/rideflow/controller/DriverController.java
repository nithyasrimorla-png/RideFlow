
package com.rideflow.controller;

import com.rideflow.entity.User;
import com.rideflow.entity.Ride;
import com.rideflow.repository.UserRepository;
import com.rideflow.repository.RideRepository;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/drivers")
@CrossOrigin(origins = "http://localhost:5173")
public class DriverController {

    private static final List<Ride.RideStatus> ACTIVE_STATUSES =
            List.of(
                    Ride.RideStatus.ACCEPTED,
                    Ride.RideStatus.ONGOING
            );

    private final UserRepository userRepository;
    private final RideRepository rideRepository;

    public DriverController(
            UserRepository userRepository,
            RideRepository rideRepository) {

        this.userRepository = userRepository;
        this.rideRepository = rideRepository;
    }

    private Long getAuthenticatedUserId(Jwt jwt) {
        try {
            return Long.parseLong(jwt.getSubject());
        } catch (NumberFormatException | NullPointerException exception) {
            throw new IllegalStateException("Invalid authenticated user ID");
        }
    }

    private String getAuthenticatedRole(Jwt jwt) {
        return jwt.getClaimAsString("role");
    }

    private boolean isDriver(Jwt jwt) {
        return "DRIVER".equals(getAuthenticatedRole(jwt));
    }

    private ResponseEntity<?> forbidden(String message) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("message", message));
    }

    @PutMapping("/{driverId}/availability")
    @Transactional
    public ResponseEntity<?> updateAvailability(
            @PathVariable Long driverId,
            @RequestBody Map<String, Boolean> request,
            @AuthenticationPrincipal Jwt jwt) {

        if (!isDriver(jwt)) {
            return forbidden("Only drivers can update availability.");
        }

        if (!driverId.equals(getAuthenticatedUserId(jwt))) {
            return forbidden("You can only update your own availability.");
        }

        User driver = userRepository.findByIdForUpdate(driverId)
                .orElse(null);

        if (driver == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Driver not found"));
        }

        Boolean available = request.get("available");

        if (available == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Availability status is required"));
        }

        boolean busy = rideRepository.existsByDriverIdAndStatusIn(
                driverId,
                ACTIVE_STATUSES
        );

        if (!available && busy) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of(
                            "message",
                            "Complete or cancel your active ride before going offline.",
                            "workStatus",
                            "BUSY"
                    ));
        }

        driver.setAvailable(available);
        userRepository.save(driver);

        String workStatus = !available
                ? "OFFLINE"
                : busy ? "BUSY" : "AVAILABLE";

        return ResponseEntity.ok(
                Map.of(
                        "message", "Driver availability updated successfully",
                        "driverId", driver.getId(),
                        "available", driver.isAvailable(),
                        "status", driver.isAvailable() ? "ONLINE" : "OFFLINE",
                        "workStatus", workStatus
                )
        );
    }

    @GetMapping("/{driverId}/availability")
    public ResponseEntity<?> getAvailability(
            @PathVariable Long driverId,
            @AuthenticationPrincipal Jwt jwt) {

        if (!isDriver(jwt)) {
            return forbidden("Only drivers can view driver availability.");
        }

        if (!driverId.equals(getAuthenticatedUserId(jwt))) {
            return forbidden("You can only view your own availability.");
        }

        User driver = userRepository.findById(driverId).orElse(null);

        if (driver == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Driver not found"));
        }

        boolean busy = rideRepository.existsByDriverIdAndStatusIn(
                driverId,
                ACTIVE_STATUSES
        );

        String workStatus = !driver.isAvailable()
                ? "OFFLINE"
                : busy ? "BUSY" : "AVAILABLE";

        return ResponseEntity.ok(
                Map.of(
                        "driverId", driver.getId(),
                        "name", driver.getName(),
                        "available", driver.isAvailable(),
                        "status", driver.isAvailable() ? "ONLINE" : "OFFLINE",
                        "workStatus", workStatus
                )
        );
    }

    @GetMapping("/available")
    public ResponseEntity<?> getAvailableDrivers(
            @AuthenticationPrincipal Jwt jwt) {

        String role = getAuthenticatedRole(jwt);

        if (!"RIDER".equals(role) && !"DRIVER".equals(role)) {
            return forbidden("You are not authorized to view available drivers.");
        }

        List<User> onlineDrivers = userRepository.findByRoleAndAvailable(
                User.Role.DRIVER,
                true
        );

        List<Map<String, Object>> response = onlineDrivers.stream()
                .filter(driver ->
                        !rideRepository.existsByDriverIdAndStatusIn(
                                driver.getId(),
                                ACTIVE_STATUSES
                        )
                )
                .map(driver -> Map.<String, Object>of(
                        "driverId", driver.getId(),
                        "name", driver.getName(),
                        "phone", driver.getPhone() == null
                                ? ""
                                : driver.getPhone(),
                        "available", true,
                        "status", "ONLINE",
                        "workStatus", "AVAILABLE"
                ))
                .toList();

        return ResponseEntity.ok(
                Map.of(
                        "totalAvailableDrivers", response.size(),
                        "drivers", response
                )
        );
    }

    @GetMapping("/{driverId}/dashboard")
    public ResponseEntity<?> getDriverDashboard(
            @PathVariable Long driverId,
            @AuthenticationPrincipal Jwt jwt) {

        if (!isDriver(jwt)) {
            return forbidden("Only drivers can access the driver dashboard.");
        }

        if (!driverId.equals(getAuthenticatedUserId(jwt))) {
            return forbidden("You can only access your own dashboard.");
        }

        User driver = userRepository.findById(driverId).orElse(null);

        if (driver == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Driver not found"));
        }

        long totalRides = rideRepository.countByDriverId(driverId);

        long completedRides = rideRepository.countByDriverIdAndStatus(
                driverId,
                Ride.RideStatus.COMPLETED
        );

        long acceptedRides = rideRepository.countByDriverIdAndStatus(
                driverId,
                Ride.RideStatus.ACCEPTED
        );

        long ongoingRides = rideRepository.countByDriverIdAndStatus(
                driverId,
                Ride.RideStatus.ONGOING
        );

        long activeRides = acceptedRides + ongoingRides;

        Double earnings = rideRepository.calculateDriverEarnings(
                driverId,
                Ride.RideStatus.COMPLETED
        );

        String workStatus = !driver.isAvailable()
                ? "OFFLINE"
                : activeRides > 0 ? "BUSY" : "AVAILABLE";

        return ResponseEntity.ok(
                Map.of(
                        "driverId", driver.getId(),
                        "driverName", driver.getName(),
                        "availability", driver.isAvailable()
                                ? "ONLINE"
                                : "OFFLINE",
                        "workStatus", workStatus,
                        "totalRides", totalRides,
                        "completedRides", completedRides,
                        "activeRides", activeRides,
                        "totalEarnings", earnings != null ? earnings : 0.0,
                        "currency", "INR"
                )
        );
    }
}

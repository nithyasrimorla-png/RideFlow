
package com.rideflow.controller;

import com.rideflow.entity.User;
import com.rideflow.entity.Ride;
import com.rideflow.repository.UserRepository;
import com.rideflow.repository.RideRepository;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/drivers")
@CrossOrigin(origins = "*")
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

    @PutMapping("/{driverId}/availability")
    @Transactional
    public ResponseEntity<?> updateAvailability(
            @PathVariable Long driverId,
            @RequestBody Map<String, Boolean> request) {

        User driver = userRepository.findByIdForUpdate(driverId)
                .orElse(null);

        if (driver == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Driver not found"));
        }

        if (driver.getRole() != User.Role.DRIVER) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "User is not a driver"));
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
            @PathVariable Long driverId) {

        User driver = userRepository.findById(driverId).orElse(null);

        if (driver == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Driver not found"));
        }

        if (driver.getRole() != User.Role.DRIVER) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "User is not a driver"));
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
    public ResponseEntity<?> getAvailableDrivers() {

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
            @PathVariable Long driverId) {

        User driver = userRepository.findById(driverId).orElse(null);

        if (driver == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Driver not found"));
        }

        if (driver.getRole() != User.Role.DRIVER) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "User is not a driver"));
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

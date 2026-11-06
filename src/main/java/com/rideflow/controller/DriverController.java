
package com.rideflow.controller;

import com.rideflow.entity.User;
import com.rideflow.repository.UserRepository;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/drivers")
@CrossOrigin(origins = "*")
public class DriverController {

    private final UserRepository userRepository;

    public DriverController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @PutMapping("/{driverId}/availability")
    public ResponseEntity<?> updateAvailability(
            @PathVariable Long driverId,
            @RequestBody Map<String, Boolean> request) {

        User driver = userRepository.findById(driverId).orElse(null);

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

        driver.setAvailable(available);
        userRepository.save(driver);

        return ResponseEntity.ok(
                Map.of(
                        "message", "Driver availability updated successfully",
                        "driverId", driver.getId(),
                        "available", driver.isAvailable()
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

        return ResponseEntity.ok(
                Map.of(
                        "driverId", driver.getId(),
                        "name", driver.getName(),
                        "available", driver.isAvailable(),
                        "status", driver.isAvailable() ? "ONLINE" : "OFFLINE"
                )
        );
    }

    @GetMapping("/available")
    public ResponseEntity<?> getAvailableDrivers() {

        List<User> drivers = userRepository.findByRoleAndAvailable(
                User.Role.DRIVER,
                true
        );

        List<Map<String, Object>> response = drivers.stream()
                .map(driver -> Map.<String, Object>of(
                        "driverId", driver.getId(),
                        "name", driver.getName(),
                        "phone", driver.getPhone(),
                        "available", driver.isAvailable(),
                        "status", "ONLINE"
                ))
                .toList();

        return ResponseEntity.ok(
                Map.of(
                        "totalAvailableDrivers", response.size(),
                        "drivers", response
                )
        );
    }
}

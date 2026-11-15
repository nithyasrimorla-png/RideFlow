
package com.rideflow.controller;

import com.rideflow.entity.Ride;
import com.rideflow.entity.User;
import com.rideflow.repository.RideRepository;
import com.rideflow.repository.UserRepository;
import com.rideflow.service.DriverAssignmentService;
import com.rideflow.service.FareService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/rides")
@CrossOrigin(origins = "http://localhost:5173")
public class RideController {

    private static final List<Ride.RideStatus> ACTIVE_STATUSES =
            List.of(
                    Ride.RideStatus.ACCEPTED,
                    Ride.RideStatus.ONGOING
            );

    private final RideRepository rideRepository;
    private final UserRepository userRepository;
    private final FareService fareService;
    private final DriverAssignmentService driverAssignmentService;

    public RideController(
            RideRepository rideRepository,
            UserRepository userRepository,
            FareService fareService,
            DriverAssignmentService driverAssignmentService) {

        this.rideRepository = rideRepository;
        this.userRepository = userRepository;
        this.fareService = fareService;
        this.driverAssignmentService = driverAssignmentService;
    }


    private Long getAuthenticatedUserId(Jwt jwt) {
        try {
            return Long.parseLong(jwt.getSubject());
        } catch (NumberFormatException | NullPointerException e) {
            return null;
        }
    }


    private String getAuthenticatedRole(Jwt jwt) {
        return jwt != null ? jwt.getClaimAsString("role") : null;
    }


    @PostMapping("/book")
    @Transactional
    public ResponseEntity<?> bookRide(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody Map<String, Object> request) {

        Long authenticatedUserId = getAuthenticatedUserId(jwt);

        if (authenticatedUserId == null
                || !"RIDER".equals(getAuthenticatedRole(jwt))) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Only riders can book rides"));
        }

        if (request.get("riderId") == null
                || request.get("pickupLocation") == null
                || request.get("dropLocation") == null
                || request.get("distanceKm") == null) {

            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Rider ID, pickup, drop and distance are required"
                    ));
        }

        try {
            Long riderId = Long.parseLong(
                    request.get("riderId").toString()
            );

            if (!authenticatedUserId.equals(riderId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of(
                                "message",
                                "You can only book rides for your own account"
                        ));
            }

            String pickupLocation =
                    request.get("pickupLocation").toString().trim();

            String dropLocation =
                    request.get("dropLocation").toString().trim();

            double distanceKm = Double.parseDouble(
                    request.get("distanceKm").toString()
            );

            if (!Double.isFinite(distanceKm) || distanceKm <= 0) {
                return ResponseEntity.badRequest()
                        .body(Map.of(
                                "message",
                                "Distance must be a valid positive number"
                        ));
            }

            if (pickupLocation.isBlank()
                    || dropLocation.isBlank()) {

                return ResponseEntity.badRequest()
                        .body(Map.of(
                                "message",
                                "Pickup and drop locations cannot be empty"
                        ));
            }

            User rider = userRepository.findById(authenticatedUserId)
                    .orElse(null);

            if (rider == null
                    || rider.getRole() != User.Role.RIDER) {

                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of(
                                "message",
                                "Valid rider account not found"
                        ));
            }

            Map<String, Object> fareDetails =
                    fareService.calculateFare(distanceKm);

            Double calculatedFare =
                    ((Number) fareDetails.get("totalFare"))
                            .doubleValue();

            Ride ride = new Ride();
            ride.setRider(rider);
            ride.setPickupLocation(pickupLocation);
            ride.setDropLocation(dropLocation);
            ride.setFare(calculatedFare);

            Ride savedRide = rideRepository.save(ride);


            User assignedDriver =
                    driverAssignmentService.assignDriver(savedRide);

            Map<String, Object> response = new HashMap<>();

            response.put("message", "Ride booked successfully");
            response.put("rideId", savedRide.getId());
            response.put("riderName", rider.getName());

            response.put(
                    "driverName",
                    assignedDriver != null
                            ? assignedDriver.getName()
                            : "Not assigned"
            );

            response.put(
                    "assignmentMessage",
                    assignedDriver != null
                            ? "Driver assigned successfully"
                            : "No online driver available. Waiting for a driver."
            );

            response.put("pickupLocation", savedRide.getPickupLocation());
            response.put("dropLocation", savedRide.getDropLocation());
            response.put("distanceKm", distanceKm);
            response.put("fare", savedRide.getFare());
            response.put("fareBreakdown", fareDetails);
            response.put("status", savedRide.getStatus().toString());

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(response);

        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Invalid rider ID or distance"
                    ));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }


    @GetMapping("/rider/{riderId}")
    public ResponseEntity<?> getRiderHistory(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long riderId) {

        Long authenticatedUserId = getAuthenticatedUserId(jwt);

        if (!"RIDER".equals(getAuthenticatedRole(jwt))
                || authenticatedUserId == null
                || !authenticatedUserId.equals(riderId)) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                            "message",
                            "You can only access your own ride history"
                    ));
        }

        User rider = userRepository.findById(authenticatedUserId)
                .orElse(null);

        if (rider == null
                || rider.getRole() != User.Role.RIDER) {

            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Rider not found"));
        }

        List<Map<String, Object>> history =
                rideRepository.findByRiderId(authenticatedUserId)
                        .stream()
                        .<Map<String, Object>>map(this::convertRideToResponse)
                        .toList();

        return ResponseEntity.ok(history);
    }


    @GetMapping("/driver/{driverId}")
    public ResponseEntity<?> getDriverHistory(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long driverId) {

        Long authenticatedUserId = getAuthenticatedUserId(jwt);

        if (!"DRIVER".equals(getAuthenticatedRole(jwt))
                || authenticatedUserId == null
                || !authenticatedUserId.equals(driverId)) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                            "message",
                            "You can only access your own driver history"
                    ));
        }

        User driver = userRepository.findById(authenticatedUserId)
                .orElse(null);

        if (driver == null
                || driver.getRole() != User.Role.DRIVER) {

            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Driver not found"));
        }

        List<Map<String, Object>> history =
                rideRepository.findByDriverId(authenticatedUserId)
                        .stream()
                        .<Map<String, Object>>map(this::convertRideToResponse)
                        .toList();

        return ResponseEntity.ok(history);
    }


    @GetMapping("/available/{driverId}")
    public ResponseEntity<?> getAvailableRides(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long driverId) {

        Long authenticatedUserId = getAuthenticatedUserId(jwt);

        if (!"DRIVER".equals(getAuthenticatedRole(jwt))
                || authenticatedUserId == null
                || !authenticatedUserId.equals(driverId)) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                            "message",
                            "Only drivers can access their available rides"
                    ));
        }

        User driver = userRepository.findById(authenticatedUserId)
                .orElse(null);

        if (driver == null
                || driver.getRole() != User.Role.DRIVER) {

            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Driver not found"));
        }

        boolean busy = rideRepository.existsByDriverIdAndStatusIn(
                authenticatedUserId,
                ACTIVE_STATUSES
        );

        if (!driver.isAvailable() || busy) {
            return ResponseEntity.ok(List.of());
        }

        List<Map<String, Object>> availableRides =
                rideRepository.findByStatus(Ride.RideStatus.REQUESTED)
                        .stream()
                        .filter(ride -> ride.getDriver() == null)
                        .<Map<String, Object>>map(this::convertRideToResponse)
                        .toList();

        return ResponseEntity.ok(availableRides);
    }


    @PutMapping("/{rideId}/accept/{driverId}")
    @Transactional
    public ResponseEntity<?> acceptRide(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long rideId,
            @PathVariable Long driverId) {

        Long authenticatedUserId = getAuthenticatedUserId(jwt);

        if (!"DRIVER".equals(getAuthenticatedRole(jwt))
                || authenticatedUserId == null
                || !authenticatedUserId.equals(driverId)) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                            "message",
                            "You can only accept rides using your own driver account"
                    ));
        }

        User driver = userRepository.findByIdForUpdate(
                authenticatedUserId
        ).orElse(null);

        if (driver == null
                || driver.getRole() != User.Role.DRIVER) {

            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Driver not found"));
        }

        if (!driver.isAvailable()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of(
                            "message",
                            "You are offline. Go online to accept rides."
                    ));
        }

        boolean alreadyBusy =
                rideRepository.existsByDriverIdAndStatusIn(
                        authenticatedUserId,
                        ACTIVE_STATUSES
                );

        if (alreadyBusy) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of(
                            "message",
                            "You already have an active ride. Complete or cancel it before accepting another ride.",
                            "workStatus",
                            "BUSY"
                    ));
        }

        Ride ride = rideRepository.findById(rideId)
                .orElse(null);

        if (ride == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Ride not found"));
        }

        int updatedRows = rideRepository.assignDriverIfAvailable(
                rideId,
                driver,
                authenticatedUserId,
                Ride.RideStatus.REQUESTED,
                Ride.RideStatus.ACCEPTED
        );

        if (updatedRows == 0) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of(
                            "message",
                            "Ride is no longer available or your availability changed"
                    ));
        }

        return ResponseEntity.ok(Map.of(
                "message", "Ride accepted successfully",
                "rideId", rideId,
                "driverName", driver.getName(),
                "status", Ride.RideStatus.ACCEPTED.toString(),
                "workStatus", "BUSY"
        ));
    }

    @PutMapping("/{rideId}/status/{driverId}")
    @Transactional
    public ResponseEntity<?> updateRideStatus(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long rideId,
            @PathVariable Long driverId,
            @RequestBody Map<String, String> request) {

        Long authenticatedUserId = getAuthenticatedUserId(jwt);

        if (!"DRIVER".equals(getAuthenticatedRole(jwt))
                || authenticatedUserId == null
                || !authenticatedUserId.equals(driverId)) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                            "message",
                            "Only the authenticated driver can update ride status"
                    ));
        }

        Ride ride = rideRepository.findById(rideId)
                .orElse(null);

        if (ride == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Ride not found"));
        }

        User driver = userRepository.findById(authenticatedUserId)
                .orElse(null);

        if (driver == null
                || driver.getRole() != User.Role.DRIVER) {

            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Driver not found"));
        }

        if (ride.getDriver() == null
                || !ride.getDriver().getId().equals(authenticatedUserId)) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                            "message",
                            "You are not authorized to update this ride"
                    ));
        }

        String newStatus = request.get("status");

        if (newStatus == null || newStatus.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Status is required"));
        }

        Ride.RideStatus currentStatus = ride.getStatus();

        if ("ONGOING".equalsIgnoreCase(newStatus)
                && currentStatus == Ride.RideStatus.ACCEPTED) {

            ride.setStatus(Ride.RideStatus.ONGOING);

        } else if ("COMPLETED".equalsIgnoreCase(newStatus)
                && currentStatus == Ride.RideStatus.ONGOING) {

            ride.setStatus(Ride.RideStatus.COMPLETED);

        } else {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Invalid ride status transition"
                    ));
        }

        Ride updatedRide = rideRepository.save(ride);


        Ride nextRide = null;

        if (updatedRide.getStatus() == Ride.RideStatus.COMPLETED) {
            nextRide = driverAssignmentService
                    .assignOldestPendingRide(authenticatedUserId);
        }

        boolean stillBusy =
                rideRepository.existsByDriverIdAndStatusIn(
                        authenticatedUserId,
                        ACTIVE_STATUSES
                );

        String workStatus = !driver.isAvailable()
                ? "OFFLINE"
                : stillBusy ? "BUSY" : "AVAILABLE";

        Map<String, Object> response = new HashMap<>();

        response.put("message", "Ride status updated successfully");
        response.put("rideId", updatedRide.getId());
        response.put("status", updatedRide.getStatus().toString());
        response.put("workStatus", workStatus);

        if (nextRide != null) {
            response.put("nextRideId", nextRide.getId());
            response.put("nextRideStatus", nextRide.getStatus().toString());
            response.put(
                    "message",
                    "Ride completed successfully. Next waiting ride assigned."
            );
        }

        return ResponseEntity.ok(response);
    }


    @PutMapping("/{rideId}/cancel/{userId}")
    @Transactional
    public ResponseEntity<?> cancelRide(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long rideId,
            @PathVariable Long userId) {

        Long authenticatedUserId = getAuthenticatedUserId(jwt);
        String authenticatedRole = getAuthenticatedRole(jwt);

        if (authenticatedUserId == null
                || !authenticatedUserId.equals(userId)) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                            "message",
                            "You can only cancel rides using your own account"
                    ));
        }

        if (!"RIDER".equals(authenticatedRole)
                && !"DRIVER".equals(authenticatedRole)) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Invalid user role"));
        }

        Ride ride = rideRepository.findById(rideId)
                .orElse(null);

        if (ride == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Ride not found"));
        }

        User user = userRepository.findById(authenticatedUserId)
                .orElse(null);

        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "User not found"));
        }

        boolean isRider =
                user.getRole() == User.Role.RIDER
                && ride.getRider().getId().equals(authenticatedUserId);

        boolean isDriver =
                user.getRole() == User.Role.DRIVER
                && ride.getDriver() != null
                && ride.getDriver().getId().equals(authenticatedUserId);

        if (!isRider && !isDriver) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                            "message",
                            "Not authorized to cancel this ride"
                    ));
        }

        if (ride.getStatus() != Ride.RideStatus.REQUESTED
                && ride.getStatus() != Ride.RideStatus.ACCEPTED) {

            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "This ride cannot be cancelled"
                    ));
        }


        Long freedDriverId = null;

        if (ride.getStatus() == Ride.RideStatus.ACCEPTED
                && ride.getDriver() != null) {

            freedDriverId = ride.getDriver().getId();
        }

        ride.setStatus(Ride.RideStatus.CANCELLED);

        Ride cancelledRide = rideRepository.save(ride);


        Ride nextRide = null;

        if (freedDriverId != null) {
            nextRide = driverAssignmentService
                    .assignOldestPendingRide(freedDriverId);
        }

        Map<String, Object> response = new HashMap<>();

        response.put("message", "Ride cancelled successfully");
        response.put("rideId", cancelledRide.getId());
        response.put("status", cancelledRide.getStatus().toString());

        if (nextRide != null) {
            response.put("nextRideId", nextRide.getId());
            response.put("nextRideStatus", nextRide.getStatus().toString());
            response.put(
                    "assignmentMessage",
                    "The oldest waiting ride has been assigned to the available driver."
            );
        }

        return ResponseEntity.ok(response);
    }

    private Map<String, Object> convertRideToResponse(Ride ride) {

        return Map.of(
                "rideId", ride.getId(),
                "riderName", ride.getRider().getName(),
                "driverName", ride.getDriver() != null
                        ? ride.getDriver().getName()
                        : "Not assigned",
                "pickupLocation", ride.getPickupLocation(),
                "dropLocation", ride.getDropLocation(),
                "fare", ride.getFare(),
                "status", ride.getStatus().toString(),
                "createdAt", ride.getCreatedAt().toString()
        );
    }
}

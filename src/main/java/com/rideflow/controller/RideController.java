
package com.rideflow.controller;

import com.rideflow.entity.Ride;
import com.rideflow.entity.User;
import com.rideflow.repository.RideRepository;
import com.rideflow.repository.UserRepository;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/rides")
@CrossOrigin(origins = "*")
public class RideController {

    private final RideRepository rideRepository;
    private final UserRepository userRepository;

    public RideController(
            RideRepository rideRepository,
            UserRepository userRepository) {
        this.rideRepository = rideRepository;
        this.userRepository = userRepository;
    }

    // Book a new ride
    @PostMapping("/book")
    public ResponseEntity<?> bookRide(
            @RequestBody Map<String, Object> request) {

        try {
            Long riderId = Long.valueOf(
                    request.get("riderId").toString());

            String pickupLocation =
                    request.get("pickupLocation").toString();

            String dropLocation =
                    request.get("dropLocation").toString();

            Double fare = Double.valueOf(
                    request.get("fare").toString());

            if (pickupLocation.isBlank()
                    || dropLocation.isBlank()
                    || fare <= 0) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message",
                                "Invalid ride details"));
            }

            User rider = userRepository.findById(riderId)
                    .orElse(null);

            if (rider == null
                    || rider.getRole() != User.Role.RIDER) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message",
                                "Valid rider account not found"));
            }

            Ride ride = new Ride();
            ride.setRider(rider);
            ride.setPickupLocation(pickupLocation);
            ride.setDropLocation(dropLocation);
            ride.setFare(fare);

            Ride savedRide = rideRepository.save(ride);

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(Map.of(
                            "message", "Ride booked successfully",
                            "rideId", savedRide.getId(),
                            "riderName", rider.getName(),
                            "pickupLocation",
                            savedRide.getPickupLocation(),
                            "dropLocation",
                            savedRide.getDropLocation(),
                            "fare", savedRide.getFare(),
                            "status",
                            savedRide.getStatus().toString()
                    ));

        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message",
                            "Please provide valid ride details"));
        }
    }

    @GetMapping("/rider/{riderId}")
    public ResponseEntity<?> getRiderHistory(
            @PathVariable Long riderId) {

        User rider = userRepository.findById(riderId)
                .orElse(null);

        if (rider == null || rider.getRole() != User.Role.RIDER) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Rider not found"));
        }

        List<Map<String, Object>> history =
                rideRepository.findByRiderId(riderId)
                        .stream()
                        .map(this::convertRideToResponse)
                        .toList();

        return ResponseEntity.ok(history);
    }

    // View driver ride history
    @GetMapping("/driver/{driverId}")
    public ResponseEntity<?> getDriverHistory(
            @PathVariable Long driverId) {

        User driver = userRepository.findById(driverId)
                .orElse(null);

        if (driver == null || driver.getRole() != User.Role.DRIVER) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Driver not found"));
        }

        List<Map<String, Object>> history =
                rideRepository.findByDriverId(driverId)
                        .stream()
                        .map(this::convertRideToResponse)
                        .toList();

        return ResponseEntity.ok(history);
    }
    
    
    @GetMapping("/available/{driverId}")
    public ResponseEntity<?> getAvailableRides(
            @PathVariable Long driverId) {

        User driver = userRepository.findById(driverId)
                .orElse(null);

        if (driver == null || driver.getRole() != User.Role.DRIVER) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Driver not found"));
        }

        List<Map<String, Object>> availableRides =
                rideRepository.findByStatus(Ride.RideStatus.REQUESTED)
                        .stream()
                        .map(this::convertRideToResponse)
                        .toList();

        return ResponseEntity.ok(availableRides);
    }

    
    // Driver accepts a ride request
    @PutMapping("/{rideId}/accept/{driverId}")
    public ResponseEntity<?> acceptRide(
            @PathVariable Long rideId,
            @PathVariable Long driverId) {

        User driver = userRepository.findById(driverId)
                .orElse(null);

        if (driver == null || driver.getRole() != User.Role.DRIVER) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Driver not found"));
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
                Ride.RideStatus.REQUESTED,
                Ride.RideStatus.ACCEPTED
        );

        if (updatedRows == 0) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of(
                            "message",
                            "Ride is no longer available for acceptance"
                    ));
        }

        return ResponseEntity.ok(Map.of(
                "message", "Ride accepted successfully",
                "rideId", rideId,
                "driverName", driver.getName(),
                "status", Ride.RideStatus.ACCEPTED.toString()
        ));
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

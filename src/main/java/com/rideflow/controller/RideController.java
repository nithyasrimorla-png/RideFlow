
package com.rideflow.controller;

import com.rideflow.entity.Ride;
import com.rideflow.entity.User;
import com.rideflow.repository.RideRepository;
import com.rideflow.repository.UserRepository;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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

    // Book a ride
    @PostMapping("/book")
    public ResponseEntity<?> bookRide(
            @RequestBody Map<String, String> request) {

        String riderId = request.get("riderId");
        String pickup = request.get("pickupLocation");
        String drop = request.get("dropLocation");

        if (riderId == null || pickup == null || drop == null
                || riderId.isBlank()
                || pickup.isBlank() || drop.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "All fields are required"));
        }

        try {
            Long id = Long.parseLong(riderId);

            User rider = userRepository.findById(id).orElse(null);

            if (rider == null || rider.getRole() != User.Role.RIDER) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("message", "Rider not found"));
            }

            Ride ride = new Ride();
            ride.setRider(rider);
            ride.setPickupLocation(pickup);
            ride.setDropLocation(drop);
            ride.setStatus(Ride.RideStatus.REQUESTED);

            Ride savedRide = rideRepository.save(ride);

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(Map.of(
                            "message", "Ride booked successfully",
                            "rideId", savedRide.getId(),
                            "pickupLocation", savedRide.getPickupLocation(),
                            "dropLocation", savedRide.getDropLocation(),
                            "status", savedRide.getStatus().toString()
                    ));

        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Invalid rider ID"));
        }
    }
}

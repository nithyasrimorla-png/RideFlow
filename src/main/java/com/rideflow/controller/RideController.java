
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
}

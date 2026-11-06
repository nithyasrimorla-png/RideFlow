package com.rideflow.controller;

import com.rideflow.service.FareService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/fares")
@CrossOrigin(origins = "*")
public class FareController {

    private final FareService fareService;

    public FareController(FareService fareService) {
        this.fareService = fareService;
    }

    @PostMapping("/calculate")
    public ResponseEntity<?> calculateFare(
            @RequestBody Map<String, Object> request) {
        try {
            Object distanceValue = request.get("distanceKm");

            if (distanceValue == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "Distance is required"));
            }

            double distanceKm =
                    Double.parseDouble(distanceValue.toString());

            Map<String, Object> fareDetails =
                    fareService.calculateFare(distanceKm);

            return ResponseEntity.ok(fareDetails);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Please provide a valid distance greater than zero"
                    ));
        }
    }
}
package com.rideflow.controller;

import com.rideflow.service.ReverseGeocodingService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/geocoding")
@CrossOrigin(origins = "http://localhost:5173")
public class GeocodingController {

    private final ReverseGeocodingService geocodingService;

    public GeocodingController(
            ReverseGeocodingService geocodingService
    ) {
        this.geocodingService = geocodingService;
    }

    @GetMapping("/reverse")
    public ResponseEntity<?> reverseGeocode(
            @RequestParam double lat,
            @RequestParam double lon
    ) {

        try {
            String address = geocodingService.getAddress(lat, lon);

            return ResponseEntity.ok(
                    Map.of(
                            "address", address,
                            "latitude", lat,
                            "longitude", lon
                    )
            );

        } catch (IllegalArgumentException exception) {

            return ResponseEntity.badRequest().body(
                    Map.of("message", exception.getMessage())
            );

        } catch (InterruptedException exception) {

            Thread.currentThread().interrupt();

            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of(
                            "message",
                            "Address lookup was interrupted."
                    ));

        } catch (IOException exception) {

            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of(
                            "message",
                            "Unable to retrieve the address right now."
                    ));
        }
    }
}
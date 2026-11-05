
package com.rideflow.service;

import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class FareService {

    private static final double BASE_FARE = 40.0;
    private static final double RATE_PER_KM = 12.0;
    private static final double MINIMUM_FARE = 50.0;

    public Map<String, Object> calculateFare(double distanceKm) {

        if (!Double.isFinite(distanceKm) || distanceKm <= 0) {
            throw new IllegalArgumentException(
                    "Distance must be greater than zero"
            );
        }

        double distanceFare = distanceKm * RATE_PER_KM;

        double totalFare = Math.max(
                BASE_FARE + distanceFare,
                MINIMUM_FARE
        );

        totalFare = Math.round(totalFare * 100.0) / 100.0;

        return Map.of(
                "distanceKm", distanceKm,
                "baseFare", BASE_FARE,
                "ratePerKm", RATE_PER_KM,
                "distanceFare", distanceFare,
                "totalFare", totalFare,
                "currency", "INR"
        );
    }
}

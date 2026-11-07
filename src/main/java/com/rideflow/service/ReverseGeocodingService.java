package com.rideflow.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ReverseGeocodingService {

    private static final String NOMINATIM_URL =
            "https://nominatim.openstreetmap.org/reverse";

    private static final long MIN_REQUEST_INTERVAL_MS = 1000;

    private final ObjectMapper objectMapper;

    private final HttpClient httpClient;

    private final Map<String, String> addressCache =
            new ConcurrentHashMap<>();

    private final Object rateLimitLock = new Object();

    private long lastRequestTime = 0;

    public ReverseGeocodingService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;

        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    public String getAddress(double latitude, double longitude)
            throws IOException, InterruptedException {

        if (!Double.isFinite(latitude)
                || !Double.isFinite(longitude)
                || latitude < -90 || latitude > 90
                || longitude < -180 || longitude > 180) {
            throw new IllegalArgumentException(
                    "Invalid latitude or longitude."
            );
        }

        String cacheKey = String.format(
                Locale.ROOT,
                "%.5f,%.5f",
                latitude,
                longitude
        );

        String cachedAddress = addressCache.get(cacheKey);

        if (cachedAddress != null) {
            return cachedAddress;
        }

        waitForRateLimit();

        String url = NOMINATIM_URL
                + "?format=jsonv2"
                + "&lat=" + latitude
                + "&lon=" + longitude
                + "&zoom=18"
                + "&addressdetails=1";

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(15))
                .header(
                        "User-Agent",
                        "RideFlow/1.0 (https://github.com/nithyasrimorla-png/RideFlow)"
                )
                .header("Accept", "application/json")
                .header("Accept-Language", "en")
                .GET()
                .build();

        HttpResponse<String> response = httpClient.send(
                request,
                HttpResponse.BodyHandlers.ofString()
        );

        if (response.statusCode() != 200) {
            throw new IOException(
                    "Address service returned HTTP "
                            + response.statusCode()
            );
        }

        JsonNode json = objectMapper.readTree(response.body());

        String address = json.path("display_name").asText("");

        if (address.isBlank()) {
            throw new IOException(
                    "No readable address was found for these coordinates."
            );
        }

        addressCache.put(cacheKey, address);

        return address;
    }

    private void waitForRateLimit() throws InterruptedException {

        synchronized (rateLimitLock) {

            long elapsed = System.currentTimeMillis() - lastRequestTime;

            long waitTime = MIN_REQUEST_INTERVAL_MS - elapsed;

            if (waitTime > 0) {
                Thread.sleep(waitTime);
            }

            lastRequestTime = System.currentTimeMillis();
        }
    }
}
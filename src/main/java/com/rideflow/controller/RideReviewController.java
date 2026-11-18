package com.rideflow.controller;

import com.rideflow.entity.RideReview;
import com.rideflow.service.RideReviewService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import org.springframework.security.oauth2.jwt.Jwt;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/reviews")
@CrossOrigin(origins = "http://localhost:5173")
public class RideReviewController {

    private final RideReviewService reviewService;

    public RideReviewController(RideReviewService reviewService) {
        this.reviewService = reviewService;
    }

    public record ReviewRequest(Integer rating, String comment) {
    }

    // Submit a review
    @PostMapping("/rides/{rideId}")
    public ResponseEntity<?> submitReview(
            @PathVariable Long rideId,
            @RequestBody(required = false) ReviewRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        Long userId = getAuthenticatedUserId(jwt);
        String role = getAuthenticatedRole(jwt);

        if (userId == null) {
            return error(HttpStatus.UNAUTHORIZED, "Invalid authentication.");
        }

        if (!"RIDER".equals(role)) {
            return error(HttpStatus.FORBIDDEN, "Only riders can submit reviews.");
        }

        if (request == null) {
            return error(HttpStatus.BAD_REQUEST, "Review details are required.");
        }

        try {
            RideReview review = reviewService.submitReview(
                    userId,
                    rideId,
                    request.rating(),
                    request.comment()
            );

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(toReviewResponse(review));

        } catch (IllegalArgumentException e) {
            return error(HttpStatus.BAD_REQUEST, e.getMessage());

        } catch (SecurityException e) {
            return error(HttpStatus.FORBIDDEN, e.getMessage());

        } catch (NoSuchElementException e) {
            return error(HttpStatus.NOT_FOUND, e.getMessage());

        } catch (IllegalStateException e) {
            return error(HttpStatus.CONFLICT, e.getMessage());
        }
    }

    // View a review belonging to the authenticated user's ride
    @GetMapping("/rides/{rideId}")
    public ResponseEntity<?> getReview(
            @PathVariable Long rideId,
            @AuthenticationPrincipal Jwt jwt) {

        Long userId = getAuthenticatedUserId(jwt);
        String role = getAuthenticatedRole(jwt);

        if (userId == null) {
            return error(HttpStatus.UNAUTHORIZED, "Invalid authentication.");
        }

        try {
            RideReview review = reviewService.getReviewForRide(
                    userId,
                    role,
                    rideId
            );

            return ResponseEntity.ok(toReviewResponse(review));

        } catch (SecurityException e) {
            return error(HttpStatus.FORBIDDEN, e.getMessage());

        } catch (NoSuchElementException e) {
            return error(HttpStatus.NOT_FOUND, e.getMessage());
        }
    }

    // View a driver's average rating and review count
    @GetMapping("/drivers/{driverId}/summary")
    public ResponseEntity<?> getDriverSummary(
            @PathVariable Long driverId,
            @AuthenticationPrincipal Jwt jwt) {

        if (getAuthenticatedUserId(jwt) == null) {
            return error(HttpStatus.UNAUTHORIZED, "Invalid authentication.");
        }

        try {
            double[] summary =
                    reviewService.getDriverRatingSummary(driverId);

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("driverId", driverId);
            response.put("averageRating", summary[0]);
            response.put("totalReviews", (long) summary[1]);

            return ResponseEntity.ok(response);

        } catch (NoSuchElementException e) {
            return error(HttpStatus.NOT_FOUND, e.getMessage());

        } catch (IllegalArgumentException e) {
            return error(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    private Map<String, Object> toReviewResponse(RideReview review) {

        Map<String, Object> response = new LinkedHashMap<>();

        response.put("id", review.getId());
        response.put("rideId", review.getRide().getId());
        response.put("riderId", review.getRider().getId());
        response.put("driverId", review.getDriver().getId());
        response.put("rating", review.getRating());
        response.put("comment", review.getComment());
        response.put("createdAt", review.getCreatedAt());

        return response;
    }

    private ResponseEntity<Map<String, String>> error(
            HttpStatus status,
            String message) {

        return ResponseEntity.status(status)
                .body(Map.of("message", message));
    }

    private Long getAuthenticatedUserId(Jwt jwt) {
        try {
            return jwt == null ? null : Long.parseLong(jwt.getSubject());
        } catch (NumberFormatException | NullPointerException e) {
            return null;
        }
    }

    private String getAuthenticatedRole(Jwt jwt) {
        return jwt != null ? jwt.getClaimAsString("role") : null;
    }
}
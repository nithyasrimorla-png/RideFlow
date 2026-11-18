package com.rideflow.service;

import com.rideflow.entity.Ride;
import com.rideflow.entity.RideReview;
import com.rideflow.entity.User;
import com.rideflow.repository.RideRepository;
import com.rideflow.repository.RideReviewRepository;
import com.rideflow.repository.UserRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;

@Service
public class RideReviewService {

    private final RideRepository rideRepository;
    private final RideReviewRepository reviewRepository;
    private final UserRepository userRepository;

    public RideReviewService(
            RideRepository rideRepository,
            RideReviewRepository reviewRepository,
            UserRepository userRepository) {

        this.rideRepository = rideRepository;
        this.reviewRepository = reviewRepository;
        this.userRepository = userRepository;
    }

    // Submit a review for a completed ride
    @Transactional
    public RideReview submitReview(
            Long riderId,
            Long rideId,
            Integer rating,
            String comment) {

        if (rating == null || rating < 1 || rating > 5) {
            throw new IllegalArgumentException(
                    "Rating must be between 1 and 5."
            );
        }

        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() ->
                        new NoSuchElementException("Ride not found.")
                );

        if (ride.getRider() == null ||
                !ride.getRider().getId().equals(riderId)) {

            throw new SecurityException(
                    "You can review only your own rides."
            );
        }

        if (ride.getStatus() != Ride.RideStatus.COMPLETED) {
            throw new IllegalStateException(
                    "You can review only completed rides."
            );
        }

        if (ride.getDriver() == null) {
            throw new IllegalStateException(
                    "This ride does not have an assigned driver."
            );
        }

        if (reviewRepository.existsByRideId(rideId)) {
            throw new IllegalStateException(
                    "A review has already been submitted for this ride."
            );
        }

        String cleanedComment = comment == null
                ? null
                : comment.trim();

        if (cleanedComment != null && cleanedComment.isEmpty()) {
            cleanedComment = null;
        }

        if (cleanedComment != null && cleanedComment.length() > 1000) {
            throw new IllegalArgumentException(
                    "Feedback cannot exceed 1000 characters."
            );
        }

        User rider = ride.getRider();
        User driver = ride.getDriver();

        RideReview review = new RideReview();
        review.setRide(ride);
        review.setRider(rider);
        review.setDriver(driver);
        review.setRating(rating);
        review.setComment(cleanedComment);

        return reviewRepository.save(review);
    }

    // Get a review only if the authenticated user belongs to that ride
    @Transactional(readOnly = true)
    public RideReview getReviewForRide(
            Long userId,
            String role,
            Long rideId) {

        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() ->
                        new NoSuchElementException("Ride not found.")
                );

        boolean isRider = "RIDER".equals(role)
                && ride.getRider() != null
                && ride.getRider().getId().equals(userId);

        boolean isDriver = "DRIVER".equals(role)
                && ride.getDriver() != null
                && ride.getDriver().getId().equals(userId);

        if (!isRider && !isDriver) {
            throw new SecurityException(
                    "You cannot access this ride's review."
            );
        }

        return reviewRepository.findByRideId(rideId)
                .orElseThrow(() ->
                        new NoSuchElementException("No review found for this ride.")
                );
    }

    // Get average rating and review count for a driver
    @Transactional(readOnly = true)
    public double[] getDriverRatingSummary(Long driverId) {

        User driver = userRepository.findById(driverId)
                .orElseThrow(() ->
                        new NoSuchElementException("Driver not found.")
                );

        if (driver.getRole() != User.Role.DRIVER) {
            throw new IllegalArgumentException(
                    "The requested user is not a driver."
            );
        }

        List<RideReview> reviews =
                reviewRepository.findByDriverIdOrderByCreatedAtDesc(driverId);

        if (reviews.isEmpty()) {
            return new double[]{0.0, 0.0};
        }

        int totalRating = 0;

        for (RideReview review : reviews) {
            totalRating += review.getRating();
        }

        double average = (double) totalRating / reviews.size();

        // Round average to two decimal places
        average = Math.round(average * 100.0) / 100.0;

        return new double[]{average, reviews.size()};
    }
}
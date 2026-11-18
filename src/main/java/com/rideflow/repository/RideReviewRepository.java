
package com.rideflow.repository;

import com.rideflow.entity.RideReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RideReviewRepository extends JpaRepository<RideReview, Long> {

    boolean existsByRideId(Long rideId);

    Optional<RideReview> findByRideId(Long rideId);

    List<RideReview> findByDriverIdOrderByCreatedAtDesc(Long driverId);

    @Query("SELECT AVG(r.rating), COUNT(r.id) FROM RideReview r WHERE r.driver.id = :driverId")
    Object[] getDriverRatingSummary(@Param("driverId") Long driverId);
}

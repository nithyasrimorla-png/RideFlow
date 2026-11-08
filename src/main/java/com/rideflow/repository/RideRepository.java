
package com.rideflow.repository;

import com.rideflow.entity.Ride;
import com.rideflow.entity.User;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface RideRepository extends JpaRepository<Ride, Long> {

    List<Ride> findByRiderId(Long riderId);

    List<Ride> findByDriverId(Long driverId);

    List<Ride> findByStatus(Ride.RideStatus status);

    long countByDriverId(Long driverId);

    long countByDriverIdAndStatus(
            Long driverId,
            Ride.RideStatus status
    );

    boolean existsByDriverIdAndStatusIn(
            Long driverId,
            List<Ride.RideStatus> statuses
    );

    @Query("SELECT COALESCE(SUM(r.fare), 0) FROM Ride r " +
           "WHERE r.driver.id = :driverId " +
           "AND r.status = :status")
    Double calculateDriverEarnings(
            @Param("driverId") Long driverId,
            @Param("status") Ride.RideStatus status
    );

    @Modifying
    @Transactional
    @Query("UPDATE Ride r SET r.driver = :driver, " +
           "r.status = :acceptedStatus " +
           "WHERE r.id = :rideId " +
           "AND r.status = :requestedStatus " +
           "AND r.driver IS NULL " +
           "AND EXISTS (" +
           "SELECT u.id FROM User u " +
           "WHERE u.id = :driverId AND u.available = true)")
    int assignDriverIfAvailable(
            @Param("rideId") Long rideId,
            @Param("driver") User driver,
            @Param("driverId") Long driverId,
            @Param("requestedStatus") Ride.RideStatus requestedStatus,
            @Param("acceptedStatus") Ride.RideStatus acceptedStatus
    );
}

package com.rideflow.repository;

import com.rideflow.entity.DriverLocation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DriverLocationRepository
        extends JpaRepository<DriverLocation, Long> {

    Optional<DriverLocation> findByDriverId(Long driverId);
}
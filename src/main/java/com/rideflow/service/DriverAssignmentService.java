
package com.rideflow.service;

import com.rideflow.entity.Ride;
import com.rideflow.entity.User;
import com.rideflow.repository.RideRepository;
import com.rideflow.repository.UserRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class DriverAssignmentService {

    private static final List<Ride.RideStatus> ACTIVE_STATUSES =
            List.of(
                    Ride.RideStatus.ACCEPTED,
                    Ride.RideStatus.ONGOING
            );

    private final UserRepository userRepository;
    private final RideRepository rideRepository;

    public DriverAssignmentService(
            UserRepository userRepository,
            RideRepository rideRepository
    ) {
        this.userRepository = userRepository;
        this.rideRepository = rideRepository;
    }

    @Transactional
    public User assignDriver(Ride ride) {

        List<User> onlineDrivers =
                userRepository.findOnlineDriversForUpdate(
                        User.Role.DRIVER
                );

        for (User driver : onlineDrivers) {

            boolean busy =
                    rideRepository.existsByDriverIdAndStatusIn(
                            driver.getId(),
                            ACTIVE_STATUSES
                    );

            if (!busy && driver.isAvailable()) {

                ride.setDriver(driver);
                ride.setStatus(Ride.RideStatus.ACCEPTED);

                rideRepository.save(ride);

                return driver;
            }
        }

        return null;
    }

    @Transactional
    public Ride assignOldestPendingRide(Long driverId) {

        User driver = userRepository.findByIdForUpdate(driverId)
                .orElse(null);

        if (driver == null
                || driver.getRole() != User.Role.DRIVER
                || !driver.isAvailable()) {

            return null;
        }

        boolean busy =
                rideRepository.existsByDriverIdAndStatusIn(
                        driverId,
                        ACTIVE_STATUSES
                );

        if (busy) {
            return null;
        }

        Ride pendingRide =
                rideRepository
                        .findFirstByStatusAndDriverIsNullOrderByCreatedAtAscIdAsc(
                                Ride.RideStatus.REQUESTED
                        )
                        .orElse(null);

        if (pendingRide == null) {
            return null;
        }

        pendingRide.setDriver(driver);
        pendingRide.setStatus(Ride.RideStatus.ACCEPTED);

        return rideRepository.save(pendingRide);
    }
}

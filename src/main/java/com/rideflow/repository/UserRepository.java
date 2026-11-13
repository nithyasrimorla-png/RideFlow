
package com.rideflow.repository;

import com.rideflow.entity.User;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    List<User> findByRoleAndAvailable(
            User.Role role,
            boolean available
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u FROM User u WHERE u.id = :driverId")
    Optional<User> findByIdForUpdate(
            @Param("driverId") Long driverId
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u FROM User u " +
            "WHERE u.role = :role " +
            "AND u.available = true " +
            "ORDER BY u.id ASC")
    List<User> findOnlineDriversForUpdate(
            @Param("role") User.Role role
    );
}

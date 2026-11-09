
package com.rideflow.controller;

import com.rideflow.entity.User;
import com.rideflow.repository.UserRepository;
import com.rideflow.service.JwtService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "http://localhost:5173")
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public UserController(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService) {

        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    // User Registration
    @PostMapping("/register")
    public ResponseEntity<?> registerUser(
            @RequestBody User user) {

        if (user.getEmail() == null
                || user.getEmail().isBlank()
                || user.getPassword() == null
                || user.getPassword().isBlank()
                || user.getName() == null
                || user.getName().isBlank()
                || user.getRole() == null) {

            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Name, email, password and role are required"
                    ));
        }

        if (userRepository.existsByEmail(user.getEmail())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of(
                            "message",
                            "Email already registered"
                    ));
        }

        user.setPassword(
                passwordEncoder.encode(user.getPassword())
        );

        User savedUser = userRepository.save(user);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of(
                        "message", "User registered successfully",
                        "userId", savedUser.getId(),
                        "name", savedUser.getName(),
                        "role", savedUser.getRole().toString()
                ));
    }

    // User Login with JWT
    @PostMapping("/login")
    public ResponseEntity<?> loginUser(
            @RequestBody Map<String, String> request) {

        String email = request.get("email");
        String password = request.get("password");

        if (email == null || password == null
                || email.isBlank() || password.isBlank()) {

            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Email and password are required"
                    ));
        }

        User user = userRepository.findByEmail(email.trim())
                .orElse(null);

        if (user == null
                || !passwordEncoder.matches(
                        password,
                        user.getPassword()
                )) {

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                            "message",
                            "Invalid email or password"
                    ));
        }

        String token = jwtService.generateToken(
                user.getId(),
                user.getName(),
                user.getRole().toString()
        );

        return ResponseEntity.ok(
                Map.of(
                        "message", "Login successful",
                        "userId", user.getId(),
                        "name", user.getName(),
                        "email", user.getEmail(),
                        "role", user.getRole().toString(),
                        "token", token,
                        "tokenType", "Bearer"
                )
        );
    }
}

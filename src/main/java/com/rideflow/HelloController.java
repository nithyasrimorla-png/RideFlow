package com.rideflow;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

@RestController
public class HelloController {

    @GetMapping("/api/hello")
    public Map<String, String> hello() {
        return Map.of(
            "application", "RideFlow",
            "message", "Welcome to RideFlow!",
            "status", "Backend is running"
        );
    }
}

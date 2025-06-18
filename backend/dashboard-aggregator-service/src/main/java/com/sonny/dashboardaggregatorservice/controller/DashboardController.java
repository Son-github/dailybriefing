package com.sonny.dashboardaggregatorservice.controller;

import com.sonny.dashboardaggregatorservice.dto.DashboardResponse;
import com.sonny.dashboardaggregatorservice.service.DashboardService;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import reactor.core.publisher.Mono;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/dashboard")
class DashboardController {
    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/today")
    public Mono<ResponseEntity<DashboardResponse>> getDashboard() {
        return dashboardService.aggregate()
                .map(ResponseEntity::ok)
                .onErrorResume(e -> Mono.just(ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                        .body(new DashboardResponse("error", null, null, null, null, null, LocalDateTime.now().toString()))));
    }
}

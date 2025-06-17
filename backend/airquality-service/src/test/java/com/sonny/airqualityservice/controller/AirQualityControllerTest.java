package com.sonny.airqualityservice.controller;

import com.sonny.airqualityservice.dto.AirQualityDto;
import com.sonny.airqualityservice.service.AirQualityService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.web.servlet.MockMvc;


import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AirQualityController.class)
class AirQualityControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AirQualityService service;

    @Test
    @DisplayName("GET /api/dashboard/air/Seoul - 성공")
    void getAirQuality_success() throws Exception {
        AirQualityDto mockDto = AirQualityDto.builder()
                .city("Seoul")
                .dataTime("2025-06-17 12:00")
                .pm10(42.5)
                .pm25(25.8)
                .build();

        when(service.getAirQuality("Seoul")).thenReturn(mockDto);

        mockMvc.perform(get("/api/dashboard/air/Seoul"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("success"))
                .andExpect(jsonPath("$.data.city").value("Seoul"))
                .andExpect(jsonPath("$.data.pm10").value(42.5))
                .andExpect(jsonPath("$.data.pm25").value(25.8));
    }

}
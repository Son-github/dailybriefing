package com.sonny.weatherservice.controller;

import com.sonny.weatherservice.dto.WeatherResponseDto;
import com.sonny.weatherservice.service.WeatherService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.servlet.support.WebContentGenerator;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;


@WebMvcTest(WeatherController.class)
class WeatherControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private WeatherService weatherService;
    @Autowired
    private WebContentGenerator webContentGenerator;

    @Test
    @DisplayName("GET /api/dashboard/weather/Seoul - 성공")
    void getWeatherSuccess() throws Exception {
        WeatherResponseDto mockDto = WeatherResponseDto.builder()
                .city("Seoul")
                .weather("Clear")
                .temperature(25.0)
                .build();

        when(weatherService.getCurrentWeather("Seoul")).thenReturn(mockDto);

        mockMvc.perform(get("/api/dashboard/weather/Seoul"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.city").value("Seoul"))
                .andExpect(jsonPath("$.weather").value("Clear"))
                .andExpect(jsonPath("$.temperature").value(25.0));
    }

}
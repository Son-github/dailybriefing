package com.sonny.exchangeservice.controller;

import com.sonny.exchangeservice.dto.ExchangeRateDto;
import com.sonny.exchangeservice.service.ExchangeRateService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ExchangeRateController.class)
class ExchangeRateControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ExchangeRateService exchangeRateService;

    @Test
    @DisplayName("GET /api/dashboard/exchange/USD - 성공")
    void getRate_success() throws Exception {
        ExchangeRateDto mockDto = new ExchangeRateDto("USD", Map.of("KRW", 1350.0), "2025-06-17");
        when(exchangeRateService.getLatestRate("USD")).thenReturn(mockDto);

        mockMvc.perform(get("/api/dashboard/exchange/USD"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("success"))
                .andExpect(jsonPath("$.data.baseCurrency").value("USD"))
                .andExpect(jsonPath("$.data.rates.KRW").value(1350.0));
    }

}
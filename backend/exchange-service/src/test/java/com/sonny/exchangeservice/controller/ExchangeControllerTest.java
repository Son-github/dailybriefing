package com.sonny.exchangeservice.controller;

import com.sonny.exchangeservice.dto.MarketSummaryResponse;
import com.sonny.exchangeservice.service.ExchangeService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class ExchangeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ExchangeService exchangeService;

    @Test
    void returnsMarketSummary() throws Exception {
        when(exchangeService.getMarketSummary()).thenReturn(MarketSummaryResponse.builder()
                .usdKrw(1386.0)
                .updatedAt("2026-06-07T12:00:00")
                .build());

        mockMvc.perform(get("/exchange"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.usdKrw").value(1386.0));
    }
}

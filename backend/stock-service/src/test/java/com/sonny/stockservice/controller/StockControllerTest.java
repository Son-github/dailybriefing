package com.sonny.stockservice.controller;

import com.sonny.stockservice.dto.StockDto;
import com.sonny.stockservice.service.StockService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(StockController.class)
class StockControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private StockService stockService;

    @Test
    void getStockIndexSuccess() throws Exception {
        StockDto dto = new StockDto("NASDAQ", 14500.0, "+1.2%", "2025-06-17 14:00:00");
        when(stockService.getIndexData("NASDAQ")).thenReturn(dto);

        mockMvc.perform(get("/api/stock/NASDAQ"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.indexName").value("NASDAQ"))
                .andExpect(jsonPath("$.price").value(14500.0));
    }

}
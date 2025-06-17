package com.sonny.stockservice.controller;

import com.sonny.stockservice.dto.StockDto;
import com.sonny.stockservice.service.StockService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard/stock")
@RequiredArgsConstructor
public class StockController {

    private final StockService stockService;

    @GetMapping("/{type}")
    public StockDto getStock(@PathVariable String type){
        return stockService.getIndexData(type.toUpperCase());
    }
}

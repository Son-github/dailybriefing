package com.sonny.exchangeservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
public class ExchangeServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(ExchangeServiceApplication.class, args);
	}

}

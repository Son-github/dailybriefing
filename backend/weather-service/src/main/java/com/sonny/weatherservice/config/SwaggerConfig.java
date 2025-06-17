package com.sonny.weatherservice.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import static java.awt.SystemColor.info;

@Configuration
public class SwaggerConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Weather Service API")
                        .version("1.0")
                        .description("현재 날씨 정보를 제공하는 API 문서입니다."));
    }
}

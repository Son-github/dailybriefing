package com.sonny.airqualityservice.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springdoc.core.models.GroupedOpenApi;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SwaggerConfig {

    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("AirQuality API")
                        .description("미세먼지 정보 제공 서비스")
                        .version("v1.0"));
    }

    @Bean
    public GroupedOpenApi airApi() {
        return GroupedOpenApi.builder().group("AirQuality").pathsToMatch("/api/dashboard/air/**").build();
    }
}

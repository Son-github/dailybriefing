package com.sonny.weatherservice;

import com.sonny.weatherservice.config.WeatherConfig;
import com.sonny.weatherservice.dto.WeatherResponseDto;
import com.sonny.weatherservice.repository.WeatherRepository;
import com.sonny.weatherservice.service.WeatherService;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class WeatherServiceApplicationTests {

    @Mock
    private WeatherRepository weatherRepository;

    @Mock
    private WeatherConfig weatherConfig;

    @InjectMocks
    private WeatherService weatherService;

    @Test
    void testWebClientAndSave() {
        // GIVEN: 환경 설정 및 API Key 제공
        weatherConfig.setApiUrl("https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtFcst");
        weatherConfig.setServiceKey("dummy-key");

        // WHEN
        WeatherResponseDto result = weatherService.fetchAndSaveSeoulWeather();

        // THEN
        assertThat(result.getLocation()).isEqualTo("서울");
    }

}

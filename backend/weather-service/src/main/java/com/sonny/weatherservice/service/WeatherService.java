package com.sonny.weatherservice.service;

import com.sonny.weatherservice.config.WeatherConfig;
import com.sonny.weatherservice.domain.Weather;
import com.sonny.weatherservice.dto.WeatherResponseDto;
import com.sonny.weatherservice.repository.WeatherRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.util.UriComponentsBuilder;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

import org.w3c.dom.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class WeatherService {

    @Value("${external.weather.api-url}")
    private String apiUrl;

    @Value("${external.weather.service-key}")
    private String serviceKey;

    private final WeatherRepository weatherRepository;
    private final WebClient webClient = WebClient.builder().build();

    public WeatherResponseDto fetchAndSaveSeoulWeather() {
        String[] base = getBaseDateAndTimeForUltraSrtNcst();
        String baseDate = base[0];
        String baseTime = base[1];
        int nx = 55, ny = 127;

        log.info("apiurl: {}", apiUrl);
        log.info("servicekey: {}", serviceKey);

        String url = UriComponentsBuilder.fromHttpUrl(apiUrl)
                .queryParam("serviceKey", serviceKey)
                .queryParam("numOfRows", 100)
                .queryParam("pageNo", 1)
                .queryParam("dataType", "XML")
                .queryParam("base_date", baseDate)
                .queryParam("base_time", baseTime)
                .queryParam("nx", nx)
                .queryParam("ny", ny)
                .build(false)
                .toUriString();

        log.info("최종 생성된 uri: {}", url);

        String xml = webClient.get()
                .uri(url)
                .accept(MediaType.APPLICATION_XML)
                .retrieve()
                .bodyToMono(String.class)
                .block();

        log.info("xml 응답: {}", xml);

        Map<String, String> parsed = parseXmlWeather(xml);

        Weather weather = Weather.builder()
                .location("서울")
                .temperature(Double.parseDouble(parsed.getOrDefault("T1H", "0")))
                .rainType(rainCodeToText(parsed.getOrDefault("PTY", "0")))
                .humidity(Integer.parseInt(parsed.getOrDefault("REH", "0")))
                .updateAt(toBaseDateTime(baseDate, baseTime))
                .build();

        weatherRepository.save(weather);

        return WeatherResponseDto.builder()
                .location(weather.getLocation())
                .temperature(weather.getTemperature())
                .rainType(weather.getRainType())
                .humidity(weather.getHumidity())
                .updateAt(weather.getUpdateAt())
                .build();
    }

    private Map<String, String> parseXmlWeather(String xml) {
        Map<String, String> result = new HashMap<>();
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            DocumentBuilder builder = factory.newDocumentBuilder();
            InputStream is = new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8));
            Document doc = builder.parse(is);
            NodeList items = doc.getElementsByTagName("item");

            for (int i = 0; i < items.getLength(); i++) {
                Node item = items.item(i);
                if (item.getNodeType() == Node.ELEMENT_NODE) {
                    Element element = (Element) item;
                    String category = getTextContent(element, "category");
                    String value = getTextContent(element, "obsrValue");
                    result.put(category, value);
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("XML 파싱 실패", e);
        }
        return result;
    }

    private String getTextContent(Element element, String tagName) {
        NodeList nodeList = element.getElementsByTagName(tagName);
        if (nodeList.getLength() > 0) {
            return nodeList.item(0).getTextContent();
        }
        return "";
    }

    private String rainCodeToText(String code) {
        return switch (code) {
            case "0" -> "없음";
            case "1" -> "비";
            case "2" -> "비/눈";
            case "3" -> "눈";
            case "4" -> "소나기";
            default -> "정보없음";
        };
    }

    private LocalDateTime toBaseDateTime(String date, String time) {
        return LocalDateTime.parse(date + time, DateTimeFormatter.ofPattern("yyyyMMddHHmm"));
    }

    private String[] getBaseDateAndTimeForUltraSrtNcst() {
        LocalDateTime now = LocalDateTime.now();

        if (now.getHour() < 1) {
            return new String[] {
                    now.minusDays(1).format(DateTimeFormatter.ofPattern("yyyyMMdd")),
                    "2300"
            };
        }

        for (int h = now.getHour(); h >= 0; h--) {
            LocalDateTime candidate = now.withHour(h).withMinute(0).withSecond(0).withNano(0);
            if (now.isAfter(candidate.plusMinutes(45))) {
                return new String[] {
                        now.format(DateTimeFormatter.ofPattern("yyyyMMdd")),
                        String.format("%02d00", h)
                };
            }
        }

        return new String[] {
                now.minusDays(1).format(DateTimeFormatter.ofPattern("yyyyMMdd")),
                "2300"
        };
    }
}



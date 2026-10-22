package com.dailybriefing.provider;

import com.dailybriefing.calendar.HolidayService;
import com.dailybriefing.common.Errors;
import com.dailybriefing.news.NewsModels;
import com.dailybriefing.transit.MobilityModels;
import java.util.List;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

/** 정제된 응답의 조회 결과만 기록합니다. 응답 본문, query string, 키, 좌표는 로그에 넣지 않습니다. */
@RestControllerAdvice
public class DataFetchLogAdvice implements ResponseBodyAdvice<Object> {

  private static final Logger log = LoggerFactory.getLogger(
    DataFetchLogAdvice.class
  );
  private static final Set<String> ENDPOINTS = Set.of(
    "/api/v1/weather",
    "/api/v1/exchange-rates",
    "/api/v1/news",
    "/api/v1/news/sections",
    "/api/v1/mobility/places",
    "/api/v1/mobility/location",
    "/api/v1/mobility/routes",
    "/api/v1/calendar/holidays"
  );
  private final String mode;

  public DataFetchLogAdvice(@Value("${app.data-mode}") String mode) {
    this.mode = mode;
  }

  public boolean supports(
    MethodParameter returnType,
    Class<? extends HttpMessageConverter<?>> converterType
  ) {
    return true;
  }

  public Object beforeBodyWrite(
    Object body,
    MethodParameter returnType,
    MediaType contentType,
    Class<? extends HttpMessageConverter<?>> converterType,
    ServerHttpRequest request,
    ServerHttpResponse response
  ) {
    String endpoint = request.getURI().getPath();
    if (!ENDPOINTS.contains(endpoint)) return body;
    response.getHeaders().set("X-Data-Mode", mode);
    if (body instanceof Errors.ErrorBody error) {
      response.getHeaders().set("X-Data-Result", "FAILED");
      log.warn(
        "data_fetch endpoint={} mode={} result=FAILED code={} message={}",
        endpoint,
        mode,
        error.code(),
        label(endpoint) + " 데이터 가져오기 실패"
      );
    } else if (body instanceof NewsModels.Sections sections) {
      var all = List.of(
        sections.it(),
        sections.economy(),
        sections.society(),
        sections.world(),
        sections.sports()
      );
      int failed = 0;
      for (var section : all) {
        if (section.error() != null) {
          failed++;
          log.warn(
            "data_fetch endpoint={} category={} mode={} result=FAILED code={} message={}",
            endpoint,
            section.category(),
            mode,
            section.error().code(),
            "뉴스(" + section.category() + ") 데이터 가져오기 실패"
          );
        } else {
          complete(
            endpoint,
            section.category().name(),
            section.meta(),
            section.items().size()
          );
        }
      }
      response
        .getHeaders()
        .set(
          "X-Data-Result",
          failed == 0 ? "SUCCESS" : failed == 5 ? "FAILED" : "PARTIAL"
        );
    } else {
      ProviderModels.Meta meta = null;
      int count = 1;
      String category = "-";
      if (body instanceof ProviderModels.Weather weather) meta = weather.meta();
      else if (body instanceof ProviderModels.Exchange exchange) {
        meta = exchange.meta();
        count = exchange.rates().size();
      } else if (body instanceof HolidayService.View holidays) {
        meta = holidays.meta();
        count = holidays.holidays().size();
      } else if (body instanceof MobilityModels.Routes routes) {
        meta = routes.meta();
        count = routes.routes().size();
      } else if (body instanceof NewsModels.Page page) {
        meta = page.meta();
        count = page.items().size();
        category = page.category().name();
      } else if (body instanceof List<?> list) count = list.size();
      response
        .getHeaders()
        .set("X-Data-Result", count == 0 ? "EMPTY" : "SUCCESS");
      complete(endpoint, category, meta, count);
    }
    return body;
  }

  private static String label(String endpoint) {
    return switch (endpoint) {
      case "/api/v1/weather" -> "날씨";
      case "/api/v1/exchange-rates" -> "환율";
      case "/api/v1/calendar/holidays" -> "공휴일";
      case "/api/v1/mobility/places" -> "장소 검색";
      case "/api/v1/mobility/location" -> "주소";
      case "/api/v1/mobility/routes" -> "이동 경로";
      default -> "뉴스";
    };
  }

  private void complete(
    String endpoint,
    String category,
    ProviderModels.Meta meta,
    int count
  ) {
    // mode와 출처는 응답 메타데이터가 있으면 그 값을 우선합니다. DEMO 성공은 실제 외부 호출이 아닙니다.
    String dataMode = meta == null ? mode : meta.mode();
    log.info(
      "data_fetch endpoint={} category={} mode={} source={} result={} items={} message={}",
      endpoint,
      category,
      dataMode,
      "DEMO".equals(dataMode) ? "SAMPLE" : "EXTERNAL_API",
      count == 0 ? "EMPTY" : "SUCCESS",
      count,
      label(endpoint) +
        " 데이터 가져오기 " +
        (count == 0 ? "완료 (결과 없음)" : "완료") +
        ("DEMO".equals(dataMode) ? " (샘플 · 외부 API 미호출)" : "")
    );
  }
}

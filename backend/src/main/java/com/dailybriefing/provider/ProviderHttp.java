package com.dailybriefing.provider;

import com.dailybriefing.common.ApiException;
import com.fasterxml.jackson.databind.JsonNode;
import io.micrometer.core.instrument.MeterRegistry;
import java.time.Instant;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class ProviderHttp {

  private final RestClient client;
  private final String mode;
  private final MeterRegistry metrics;

  public ProviderHttp(
    @Value("${app.data-mode}") String mode,
    @Value("${app.connect-timeout-ms}") int connect,
    @Value("${app.read-timeout-ms}") int read,
    MeterRegistry metrics
  ) {
    if (
      !mode.equals("DEMO") && !mode.equals("LIVE")
    ) throw new IllegalStateException("DATA_MODE must be DEMO or LIVE");
    this.mode = mode;
    this.metrics = metrics;
    var f = new SimpleClientHttpRequestFactory();
    f.setConnectTimeout(connect);
    f.setReadTimeout(read);
    client = RestClient.builder().requestFactory(f).build();
  }

  public boolean demo() {
    return mode.equals("DEMO");
  }

  public ProviderModels.Meta meta(String name) {
    return new ProviderModels.Meta(name, mode, Instant.now());
  }

  public JsonNode get(String name, String url, String keyHeader, String key) {
    return get(
      name,
      url,
      keyHeader == null
        ? java.util.Map.of()
        : java.util.Map.of(keyHeader, key == null ? "" : key)
    );
  }

  public JsonNode get(
    String name,
    String url,
    java.util.Map<String, String> headers
  ) {
    return request(name, () -> client.get().uri(url), headers);
  }

  // 이미 인코딩한 URI는 String 템플릿으로 재전달하지 않습니다. %2B→%252B 중복 인코딩 방지.
  public JsonNode get(
    String name,
    java.net.URI uri,
    java.util.Map<String, String> headers
  ) {
    return request(name, () -> client.get().uri(uri), headers);
  }

  private JsonNode request(
    String name,
    java.util.function.Supplier<RestClient.RequestHeadersSpec<?>> request,
    java.util.Map<String, String> headers
  ) {
    long start = System.nanoTime();
    boolean success = false;
    String code = "NONE";
    int httpStatus = 0;
    String exceptionType = "NONE";
    try {
      var r = request.get();
      headers.forEach((header, value) -> {
        requireKey(value);
        r.header(header, value);
      });
      // HUB가 JSON을 text/plain으로 반환하는 경우도 있어 String으로 받은 뒤 JSON만 파싱합니다.
      var response = r.retrieve().toEntity(String.class);
      httpStatus = response.getStatusCode().value();
      JsonNode result =
        new com.fasterxml.jackson.databind.ObjectMapper().readTree(
          response.getBody()
        );
      if (result == null) throw new IllegalStateException();
      success = true;
      return result;
    } catch (ApiException e) {
      code = e.code;
      throw e;
    } catch (org.springframework.web.client.RestClientResponseException e) {
      int status = e.getStatusCode().value();
      httpStatus = status;
      code =
        status == 429
          ? "PROVIDER_LIMIT"
          : status == 401
            ? "PROVIDER_AUTH"
            : status == 403
              ? "PROVIDER_FORBIDDEN"
              : "UPSTREAM_ERROR";
      // 공급자 원문은 출력하지 않습니다. 확인된 카카오맵 비활성화 사유만 고정 코드로 변환합니다.
      if (
        name.startsWith("Kakao") &&
        status == 403 &&
        e.getResponseBodyAsString().contains("disabled OPEN_MAP_AND_LOCAL")
      ) code = "KAKAO_MAP_DISABLED";
      throw providerError(name, 502, code, status);
    } catch (org.springframework.web.client.ResourceAccessException e) {
      Throwable cause = e;
      while (cause.getCause() != null && cause.getCause() != cause)
        cause = cause.getCause();
      exceptionType = cause.getClass().getSimpleName();
      code =
        cause instanceof javax.net.ssl.SSLException
          ? "PROVIDER_TLS"
          : cause instanceof java.security.cert.CertificateException ||
              cause instanceof java.security.cert.CertPathValidatorException
            ? "PROVIDER_TLS"
            : cause instanceof java.net.UnknownHostException
              ? "PROVIDER_DNS"
              : cause instanceof java.net.SocketTimeoutException
                ? "TIMEOUT"
                : cause instanceof java.net.ConnectException
                  ? "PROVIDER_CONNECT"
                  : "PROVIDER_CONNECTION";
      // TLS 예외의 최하위 원인이 인증서 구현 클래스인 경우도 포함합니다.
      Throwable nested = e;
      while (nested != null) {
        if (nested instanceof javax.net.ssl.SSLException) code = "PROVIDER_TLS";
        nested = nested.getCause();
      }
      throw providerError(name, code.equals("TIMEOUT") ? 504 : 502, code, 0);
    } catch (
      com.fasterxml.jackson.core.JsonProcessingException
      | IllegalArgumentException e
    ) {
      exceptionType = e.getClass().getSimpleName();
      code = "UPSTREAM_FORMAT";
      throw providerError(name, 502, code, httpStatus);
    } catch (Exception e) {
      exceptionType = e.getClass().getSimpleName();
      code = "UPSTREAM_ERROR";
      throw providerError(name, 502, code, httpStatus);
    } finally {
      metrics
        .counter(
          "provider.requests",
          "provider",
          name,
          "result",
          success ? "success" : "error"
        )
        .increment();
      metrics
        .timer("provider.latency", "provider", name)
        .record(java.time.Duration.ofNanos(System.nanoTime() - start));
      org.slf4j.LoggerFactory.getLogger(getClass()).info(
        "provider_http provider={} mode=LIVE result={} httpStatus={} code={} latencyMs={} exceptionType={}",
        name,
        success ? "RECEIVED" : "FAILED",
        httpStatus,
        code,
        (System.nanoTime() - start) / 1_000_000,
        exceptionType
      );
    }
  }

  private static ApiException providerError(
    String name,
    int status,
    String code,
    int upstreamStatus
  ) {
    return new ApiException(
      status,
      code,
      "외부 정보 서비스 연결을 확인해 주세요.",
      java.util.Map.of("provider", name, "upstreamStatus", upstreamStatus)
    );
  }

  public static void requireKey(String key) {
    if (key == null || key.isBlank()) throw new ApiException(
      503,
      "PROVIDER_NOT_CONFIGURED",
      "데이터 공급자 설정이 필요해요."
    );
  }

  public static <T> T decode(JsonNode raw, Class<T> type) {
    try {
      T decoded = new com.fasterxml.jackson.databind.ObjectMapper().treeToValue(
        raw,
        type
      );
      if (decoded == null) throw new IllegalArgumentException();
      return decoded;
    } catch (Exception e) {
      throw new ApiException(
        502,
        "UPSTREAM_FORMAT",
        "데이터 형식을 확인할 수 없어요."
      );
    }
  }

  public static void checkPublicData(JsonNode response) {
    String code = response.path("header").path("resultCode").asText();
    if (!code.equals("00")) throw new ApiException(
      502,
      java.util.Set.of("20", "30", "31").contains(code)
        ? "PROVIDER_AUTH"
        : code.equals("22")
          ? "PROVIDER_LIMIT"
          : "UPSTREAM_ERROR",
      "공공데이터 연결 설정을 확인해 주세요."
    );
  }
}

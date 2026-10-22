package com.dailybriefing;

import static org.assertj.core.api.Assertions.*;

import com.dailybriefing.common.Errors;
import com.dailybriefing.news.*;
import com.dailybriefing.provider.*;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.http.server.*;
import org.springframework.mock.web.*;

@ExtendWith(OutputCaptureExtension.class)
class DataFetchLogAdviceTest {

  private MockHttpServletResponse write(String uri, Object body) {
    var req = new MockHttpServletRequest("GET", uri);
    req.setQueryString("key=secret&latitude=37.123");
    var res = new MockHttpServletResponse();
    var serverResponse = new ServletServerHttpResponse(res);
    assertThat(
      new DataFetchLogAdvice("DEMO").beforeBodyWrite(
        body,
        null,
        MediaType.APPLICATION_JSON,
        MappingJackson2HttpMessageConverter.class,
        new ServletServerHttpRequest(req),
        serverResponse
      )
    ).isSameAs(body);
    serverResponse.close();
    return res;
  }

  @Test
  void completedSampleAndEmptyAreDistinctWithoutSensitiveData(
    CapturedOutput output
  ) {
    var meta = new ProviderModels.Meta("sample", "DEMO", Instant.now());
    var result = write(
      "/api/v1/news",
      new NewsModels.Page(NewsCategory.IT, List.of(), false, null, meta)
    );
    assertThat(result.getHeader("X-Data-Result")).isEqualTo("EMPTY");
    assertThat(output)
      .contains(
        "mode=DEMO source=SAMPLE result=EMPTY items=0",
        "뉴스 데이터 가져오기 완료 (결과 없음) (샘플 · 외부 API 미호출)"
      )
      .doesNotContain("secret", "37.123");
  }

  @Test
  void sectionsKeepSuccessAndFailureSeparate(CapturedOutput output) {
    var meta = new ProviderModels.Meta("NAVER", "LIVE", Instant.now());
    var ok = new NewsModels.Section(
      NewsCategory.IT,
      List.of(),
      false,
      null,
      meta,
      null
    );
    var failed = new NewsModels.Section(
      NewsCategory.SOCIETY,
      List.of(),
      false,
      null,
      null,
      new NewsModels.Failure(504, "TIMEOUT", "secret body", "ref")
    );
    var result = write(
      "/api/v1/news/sections",
      new NewsModels.Sections(ok, ok, failed, ok, ok)
    );
    assertThat(result.getHeader("X-Data-Result")).isEqualTo("PARTIAL");
    assertThat(output)
      .contains(
        "category=SOCIETY mode=DEMO result=FAILED code=TIMEOUT",
        "mode=LIVE source=EXTERNAL_API"
      )
      .doesNotContain("secret body");
  }

  @Test
  void configurationFailureIsNotLoggedAsDataReceived(CapturedOutput output) {
    write(
      "/api/v1/weather",
      new Errors.ErrorBody(
        Instant.now(),
        503,
        "PROVIDER_NOT_CONFIGURED",
        "private",
        "/api/v1/weather",
        "ref",
        null
      )
    );
    assertThat(output)
      .contains("result=FAILED code=PROVIDER_NOT_CONFIGURED")
      .doesNotContain("private");
    assertThat(
      write("/api/v1/users/me", "private").getHeader("X-Data-Mode")
    ).isNull();
  }
}

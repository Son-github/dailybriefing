package com.dailybriefing.news;

import com.dailybriefing.provider.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class NaverNewsClient {

  private final ProviderHttp http;
  private final String url, id, secret;

  public NaverNewsClient(
    ProviderHttp http,
    @Value("${app.news-url}") String url,
    @Value("${app.naver-id}") String id,
    @Value("${app.naver-secret}") String secret
  ) {
    this.http = http;
    this.url = url;
    this.id = id;
    this.secret = secret;
  }

  public NewsModels.Page get(NewsCategory category, int start, int display) {
    // DEMO도 실제 pagination 계약을 따릅니다. 샘플의 순서/offset을 LIVE처럼 유지합니다.
    if (http.demo()) {
      int total = 50;
      var articles = java.util.stream.IntStream.range(
        start - 1,
        Math.min(total, start - 1 + display)
      )
        .mapToObj(i ->
          new ProviderModels.Article(
            "demo-" + category + "-" + i,
            category.query() + " · 오늘을 읽는 브리핑 " + (i + 1),
            "샘플 기사",
            java.time.Instant.parse("2026-10-05T00:00:00Z").minusSeconds(
              i * 1800
            ),
            "실제 기사가 아닌 UI 체험용 샘플입니다. 관심 분야의 이야기를 차분히 확인해 보세요.",
            null,
            category.name(),
            null,
            null
          )
        )
        .toList();
      return page(category, start, total, articles, http.meta("샘플 뉴스"));
    }
    ProviderHttp.requireKey(id);
    ProviderHttp.requireKey(secret);
    // API HUB 전용 경로/헤더입니다. Developers 키가 아니라 NCP HUB 앱의 ID/Secret을 입력하세요.
    // URI로 전달해 한글 검색어를 UTF-8로 한 번만 인코딩합니다.
    var uri = UriComponentsBuilder.fromUriString(
      url.replaceAll("/+$", "") + "/search/v1/news"
    )
      .queryParam("query", category.query())
      .queryParam("display", display)
      .queryParam("start", start)
      .queryParam("sort", "date")
      .queryParam("format", "json")
      .build()
      .encode()
      .toUri();
    var raw = http.get(
      "NAVER",
      uri,
      Map.of("X-NCP-APIGW-API-KEY-ID", id, "X-NCP-APIGW-API-KEY", secret)
    );
    var response = ProviderHttp.decode(raw, NaverNewsSearchResponse.class);
    if (
      response.items() == null ||
      response.total() < 0 ||
      response.start() != start ||
      response.items().size() > display
    ) throw new com.dailybriefing.common.ApiException(
      502,
      "UPSTREAM_FORMAT",
      "뉴스 정보 형식을 확인할 수 없어요."
    );
    // map만 사용합니다. sort/deduplicate/ranking으로 제공 순서를 변경하지 않습니다.
    var items = response
      .items()
      .stream()
      .map(a -> NaverNewsMapper.map(a, category.name()))
      .toList();
    return page(
      category,
      start,
      response.total(),
      items,
      http.meta("NAVER API HUB 뉴스 검색")
    );
  }

  private NewsModels.Page page(
    NewsCategory category,
    int start,
    int total,
    List<ProviderModels.Article> items,
    ProviderModels.Meta meta
  ) {
    int next = start + items.size();
    boolean more = !items.isEmpty() && next <= Math.min(total, 1000);
    return new NewsModels.Page(category, items, more, more ? next : null, meta);
  }
}

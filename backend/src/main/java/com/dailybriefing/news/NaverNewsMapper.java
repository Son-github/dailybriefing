package com.dailybriefing.news;

import com.dailybriefing.common.ApiException;
import com.dailybriefing.provider.ProviderModels;
import java.net.URI;
import java.time.*;
import java.time.format.DateTimeFormatter;

public final class NaverNewsMapper {

  public static String plain(String value) {
    if (value == null) return "";
    // HTML을 렌더링하지 않습니다. escape decoding 이후에도 React는 항상 text node로 출력합니다.
    String text = value
      .replaceAll("(?is)<script\\b[^>]*>.*?</script>", "")
      .replaceAll("<[^>]*>", "");
    text = text
      .replace("&quot;", "\"")
      .replace("&apos;", "'")
      .replace("&#39;", "'")
      .replace("&lt;", "<")
      .replace("&gt;", ">")
      .replace("&nbsp;", " ")
      .replace("&amp;", "&");
    var matcher = java.util.regex.Pattern.compile(
      "&#(x[0-9a-fA-F]+|[0-9]+);"
    ).matcher(text);
    var out = new StringBuffer();
    while (matcher.find()) {
      try {
        var token = matcher.group(1);
        int cp = token.startsWith("x")
          ? Integer.parseInt(token.substring(1), 16)
          : Integer.parseInt(token);
        matcher.appendReplacement(
          out,
          java.util.regex.Matcher.quoteReplacement(
            new String(Character.toChars(cp))
          )
        );
      } catch (Exception e) {
        matcher.appendReplacement(out, "");
      }
    }
    matcher.appendTail(out);
    return out.toString().replaceAll("[\\p{Cntrl}]", " ").trim();
  }

  private static String safeUrl(String url) {
    try {
      var uri = URI.create(url);
      return java.util.Set.of("http", "https").contains(uri.getScheme()) &&
        uri.getHost() != null
        ? url
        : null;
    } catch (Exception e) {
      return null;
    }
  }

  public static ProviderModels.Article map(
    NaverNewsResponse raw,
    String category
  ) {
    try {
      String original = safeUrl(raw.originallink()),
        provider = safeUrl(raw.link());
      String url = original != null ? original : provider;
      return new ProviderModels.Article(
        java.util.UUID.nameUUIDFromBytes(
          (url == null ? raw.title() : url).getBytes(
            java.nio.charset.StandardCharsets.UTF_8
          )
        ).toString(),
        plain(raw.title()),
        url == null ? "NAVER 뉴스 검색" : URI.create(url).getHost(),
        ZonedDateTime.parse(
          raw.pubDate(),
          DateTimeFormatter.RFC_1123_DATE_TIME
        ).toInstant(),
        plain(raw.description()),
        url,
        category,
        original,
        provider
      );
    } catch (Exception e) {
      throw new ApiException(
        502,
        "UPSTREAM_FORMAT",
        "뉴스 정보 형식을 확인할 수 없어요."
      );
    }
  }
}

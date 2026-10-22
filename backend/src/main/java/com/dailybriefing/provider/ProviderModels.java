package com.dailybriefing.provider;

import java.time.Instant;
import java.util.List;

public final class ProviderModels {

  private ProviderModels() {}

  public record Meta(String provider, String mode, Instant updatedAt) {}

  public record Weather(
    double temperature,
    Double feelsLike,
    Double high,
    Double low,
    String condition,
    int humidity,
    int precipitation,
    Meta meta
  ) {}

  public record Rate(
    String currency,
    String pair,
    java.math.BigDecimal value,
    Double change,
    Double changePercent,
    String currencyName,
    int displayUnit
  ) {}

  public record Exchange(List<Rate> rates, Meta meta) {}

  public record Article(
    String id,
    String title,
    String source,
    Instant publishedAt,
    String summary,
    String url,
    String category,
    String originalUrl,
    String providerUrl
  ) {}

  public record Briefing(List<String> summaries, Meta meta) {}
}

package com.dailybriefing.news;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/news")
public class NewsController {

  private final NewsService news;

  public NewsController(NewsService news) {
    this.news = news;
  }

  @GetMapping("/sections")
  public ResponseEntity<NewsModels.Sections> sections() {
    return ResponseEntity.ok()
      .cacheControl(CacheControl.noStore())
      .body(news.sections());
  }

  @GetMapping
  public ResponseEntity<NewsModels.Page> page(
    @RequestParam(defaultValue = "IT") String category,
    @RequestParam(defaultValue = "1") int start,
    @RequestParam(defaultValue = "5") int display
  ) {
    return ResponseEntity.ok()
      .cacheControl(CacheControl.noStore())
      .body(news.get(NewsCategory.parse(category), start, display));
  }
}

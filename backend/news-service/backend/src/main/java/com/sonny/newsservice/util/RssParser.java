package com.sonny.newsservice.util;

import com.rometools.rome.feed.synd.SyndEntry;
import com.rometools.rome.feed.synd.SyndFeed;
import com.rometools.rome.io.SyndFeedInput;
import com.rometools.rome.io.XmlReader;
import com.sonny.newsservice.dto.NewsItem;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;

import java.net.URL;
import java.util.List;
import java.util.stream.Collectors;

public class RssParser {

    public static List<NewsItem> fetchNewsWithLinks(String rssUrl) {
        try {
            URL url = new URL(rssUrl);
            SyndFeedInput input = new SyndFeedInput();
            SyndFeed feed = input.build(new XmlReader(url));

            return feed.getEntries().stream()
                    .limit(10) // 상위 10개만
                    .map(entry -> {
                        String content = fetchArticleContent(entry.getLink());
                        return NewsItem.builder()
                                .title(entry.getTitle())
                                .link(entry.getLink())
                                .content(content)
                                .build();
                    })
                    .collect(Collectors.toList());
        } catch (Exception e) {
            e.printStackTrace();
            return List.of();
        }
    }

    private static String fetchArticleContent(String link) {
        try {
            Document doc = Jsoup.connect(link).get();
            return doc.select("p").text(); // 모든 <p> 합치기
        } catch (Exception e) {
            return "";
        }
    }
}


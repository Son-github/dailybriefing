package com.sonny.newsservice.util;

import com.rometools.rome.feed.synd.SyndEntry;
import com.rometools.rome.io.SyndFeedInput;
import com.rometools.rome.io.XmlReader;

import java.net.URL;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

public class RssParser {

    public static List<String> fetchNewsTitles(String feedUrl) {
        try (XmlReader reader = new XmlReader(new URL(feedUrl))) {
            var feed = new SyndFeedInput().build(reader);
            return feed.getEntries().stream()
                    .map(entry -> ((SyndEntry) entry).getTitle())
                    .limit(10)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            System.err.println("Rss 파싱 실패: " + e.getMessage());
            return Collections.emptyList();
        }
    }
}

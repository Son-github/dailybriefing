package com.sonny.newsservice.util;

import com.rometools.rome.feed.synd.SyndEntry;
import com.rometools.rome.feed.synd.SyndFeed;
import com.rometools.rome.io.SyndFeedInput;
import com.rometools.rome.io.XmlReader;
import com.sonny.newsservice.dto.NewsItem;

import java.net.URL;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

public class RssParser {

    public static List<NewsItem> fetchNewsWithLinks(String rssUrl) {
        List<NewsItem> newsItems = new ArrayList<>();
        try {
            URL url = new URL(rssUrl);
            SyndFeedInput input = new SyndFeedInput();
            SyndFeed feed = input.build(new XmlReader(url));

            for (SyndEntry entry : feed.getEntries()) {
                newsItems.add(new NewsItem(entry.getTitle(), entry.getLink(), null));
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return newsItems;
    }

}

package com.sonny.newsservice.service;

import com.rometools.rome.feed.synd.SyndEntry;
import com.rometools.rome.feed.synd.SyndFeed;
import com.rometools.rome.io.SyndFeedInput;
import com.rometools.rome.io.XmlReader;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Component
@RequiredArgsConstructor
public class GoogleNewsRssClient {

    private final WebClient webClient;

    public List<SyndEntry> fetch(String rssUrl) {
        String xml;
        try {
            xml = webClient.get()
                    .uri(rssUrl)
                    .header(HttpHeaders.USER_AGENT, "Mozilla/5.0 (compatible; dailybriefing/1.0)")
                    .accept(MediaType.APPLICATION_XML)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to fetch RSS from Google News. url=" + rssUrl, e);
        }

        if (xml == null || xml.isBlank()) {
            throw new IllegalStateException("RSS response is empty. url=" + rssUrl);
        }

        try (XmlReader reader = new XmlReader(new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8)))) {
            SyndFeed feed = new SyndFeedInput().build(reader);
            return feed.getEntries();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to parse RSS feed. url=" + rssUrl, e);
        }
    }
}

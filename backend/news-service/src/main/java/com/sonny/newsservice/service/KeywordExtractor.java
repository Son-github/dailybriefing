package com.sonny.newsservice.service;

import org.springframework.stereotype.Component;

import java.util.*;
import java.util.regex.Pattern;

@Component
public class KeywordExtractor {

    // ✅ "제목 - 언론사" 꼬리 제거 (Google News RSS에서 매우 흔함)
    // 예) "… - 조선일보" → "…"
    private static final Pattern TRAILING_SOURCE = Pattern.compile("\\s*-\\s*[^-]{1,30}$");

    private static final Pattern SPLIT = Pattern.compile("[\\s\\p{Punct}]+");

    // ✅ 언론사/불용어 강화
    private static final Set<String> STOPWORDS = new HashSet<>(Set.of(
            // 일반 불용어
            "오늘","정부","한국","관련","논란","발표","단독","속보","기자",
            "이유","확인","공개","전망","가능","결과","최신","핵심","이슈",
            "한다","했다","된다","됐다","했다는","한다는","…","·",

            // 너무 자주 나오는 기능어/조사 비슷한 것(간단 필터)
            "에서","에게","으로","까지","부터","위해","대한","관련해","통해",

            // ✅ 언론사/플랫폼 (여기 계속 늘리면 트렌드 품질 확 올라감)
            "조선일보","중앙일보","동아일보","한겨레","경향신문","연합뉴스","뉴시스","뉴스1",
            "한국일보","서울신문","세계일보","국민일보","매일경제","한국경제","머니투데이",
            "SBS","KBS","MBC","JTBC","YTN","MBN","채널A","TV조선",
            "네이버","다음","구글","Google","News"
    ));

    // ✅ 제목 정규화(언론사 꼬리 제거 + 공백 정리)
    public String normalizeTitle(String title) {
        if (title == null) return "";
        String t = title.trim();
        t = TRAILING_SOURCE.matcher(t).replaceAll("");
        t = t.replaceAll("\\s+", " ").trim();
        return t;
    }

    public List<String> extractFromTitle(String rawTitle) {
        String title = normalizeTitle(rawTitle);
        if (title.isBlank()) return List.of();

        String[] tokens = SPLIT.split(title);

        List<String> out = new ArrayList<>();
        for (String raw : tokens) {
            if (raw == null) continue;

            String t = raw.replaceAll("[\"“”‘’()\\[\\]{}]", "").trim();
            if (t.isBlank()) continue;

            // 길이 2 이상만 (한 글자 잡음 제거)
            if (t.length() < 2) continue;

            // stopwords 제거
            if (STOPWORDS.contains(t)) continue;

            out.add(t);
        }
        return out;
    }
}


